'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();

const CASH_ROLES = ['cajero', 'encargado', 'dueno'];
const MANAGER_ROLES = ['encargado', 'dueno'];

// ── Helpers ────────────────────────────────────────────────────

function round2(n) { return Math.round(parseFloat(n || 0) * 100) / 100; }

async function getOpenSession(branchId) {
  const { data } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'open')
    .maybeSingle();
  return data;
}

async function calcSessionTotals(sessionId) {
  const { data: movements } = await supabase
    .from('cash_movements')
    .select('type, amount')
    .eq('session_id', sessionId);

  const totals = { sales: 0, expenses: 0, manual_in: 0, manual_out: 0 };
  for (const m of movements ?? []) {
    if (m.type === 'sale')       totals.sales      += parseFloat(m.amount);
    if (m.type === 'expense')    totals.expenses   += parseFloat(m.amount);
    if (m.type === 'manual_in')  totals.manual_in  += parseFloat(m.amount);
    if (m.type === 'manual_out') totals.manual_out += parseFloat(m.amount);
  }
  return totals;
}

// Calcula el desglose automático de ingresos/egresos por medio de pago
async function calcBreakdownForSession(session, companyId) {
  // Ventas en el rango de la sesión con desglose por medio de pago
  const { data: sales } = await supabase
    .from('sales')
    .select('payment_breakdown')
    .eq('company_id', companyId)
    .eq('branch_id', session.branch_id)
    .eq('status', 'completed')
    .gte('created_at', session.opened_at);

  const ingresosByPM = {};
  for (const sale of sales ?? []) {
    const breakdown = sale.payment_breakdown ?? {};
    for (const [method, amount] of Object.entries(breakdown)) {
      const key = method.toUpperCase();
      ingresosByPM[key] = round2((ingresosByPM[key] || 0) + parseFloat(amount || 0));
    }
  }

  // Gastos del día de apertura agrupados por medio de pago
  const sessionDate = session.opened_at.split('T')[0];
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, payment_method')
    .eq('company_id', companyId)
    .eq('expense_date', sessionDate);

  const egresosByPM = {};
  for (const exp of expenses ?? []) {
    const key = (exp.payment_method || 'efectivo').toUpperCase();
    egresosByPM[key] = round2((egresosByPM[key] || 0) + parseFloat(exp.amount || 0));
  }

  // Movimientos manuales de la sesión
  const { data: movements } = await supabase
    .from('cash_movements')
    .select('type, amount')
    .eq('session_id', session.id);

  let manualIn = 0, manualOut = 0;
  for (const m of movements ?? []) {
    if (m.type === 'manual_in')  manualIn  += parseFloat(m.amount);
    if (m.type === 'manual_out') manualOut += parseFloat(m.amount);
  }

  const totalIngresos = round2(Object.values(ingresosByPM).reduce((a, b) => a + b, 0) + manualIn);
  const totalEgresos  = round2(Object.values(egresosByPM).reduce((a, b) => a + b, 0) + manualOut);
  const balanceFinal  = round2(parseFloat(session.opening_amount) + totalIngresos - totalEgresos);

  return {
    type:                'auto',
    ingresos_por_metodo: ingresosByPM,
    egresos_por_metodo:  egresosByPM,
    manual_in:           round2(manualIn),
    manual_out:          round2(manualOut),
    apertura:            parseFloat(session.opening_amount),
    total_ingresos:      totalIngresos,
    total_egresos:       totalEgresos,
    balance_final:       balanceFinal,
  };
}

// ── POST /api/cash/open — Abrir caja ──────────────────────────
router.post('/open', authenticate, requireRole(...CASH_ROLES), async (req, res) => {
  const { opening_amount, notes } = req.body;

  if (opening_amount === undefined || isNaN(parseFloat(opening_amount))) {
    return res.status(400).json({ error: 'opening_amount es requerido' });
  }

  const branchId = req.user.branch_id;
  if (!branchId) return res.status(400).json({ error: 'Usuario sin sucursal asignada' });

  const existing = await getOpenSession(branchId);
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una sesión de caja abierta en esta sucursal' });
  }

  const { data, error } = await supabase
    .from('cash_sessions')
    .insert([{
      company_id:     req.user.company_id,
      branch_id:      branchId,
      opening_amount: parseFloat(opening_amount),
      notes:          (notes || '').trim(),
      opened_by:      req.user.id,
      status:         'open',
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── GET /api/cash/close-breakdown — Recuento automático (dueño) ──
router.get('/close-breakdown', authenticate, requireRole('dueno'), async (req, res) => {
  const branchId = req.user.branch_id;
  if (!branchId) return res.status(400).json({ error: 'Usuario sin sucursal asignada' });

  const session = await getOpenSession(branchId);
  if (!session) return res.status(404).json({ error: 'No hay sesión de caja abierta en esta sucursal' });

  try {
    const breakdown = await calcBreakdownForSession(session, req.user.company_id);
    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/cash/close — Cerrar caja ───────────────────────
router.post('/close', authenticate, requireRole(...CASH_ROLES), async (req, res) => {
  const { closing_amount, notes, manual_breakdown } = req.body;
  const role    = req.user.role;
  const isOwner = role === 'dueno';

  const branchId = req.user.branch_id;
  if (!branchId) return res.status(400).json({ error: 'Usuario sin sucursal asignada' });

  const session = await getOpenSession(branchId);
  if (!session) return res.status(404).json({ error: 'No hay sesión de caja abierta en esta sucursal' });

  let closeBreakdown;
  let closingAmt;

  if (isOwner) {
    // Dueño: cierre automático basado en datos reales del sistema
    if (closing_amount === undefined || isNaN(parseFloat(closing_amount))) {
      return res.status(400).json({ error: 'closing_amount es requerido' });
    }
    closingAmt     = parseFloat(closing_amount);
    closeBreakdown = await calcBreakdownForSession(session, req.user.company_id);
  } else {
    // Cajero / Encargado: desglose manual obligatorio
    if (!manual_breakdown || typeof manual_breakdown !== 'object') {
      return res.status(400).json({ error: 'Se requiere el desglose manual de medios de pago' });
    }
    const METHODS = ['efectivo', 'virtual', 'tarjeta'];
    for (const m of METHODS) {
      const ing = manual_breakdown[m]?.ingresos;
      const egr = manual_breakdown[m]?.egresos;
      if (ing === undefined || isNaN(parseFloat(ing))) {
        return res.status(400).json({ error: `Ingresá el monto de ingresos para ${m}` });
      }
      if (egr === undefined || isNaN(parseFloat(egr))) {
        return res.status(400).json({ error: `Ingresá el monto de egresos para ${m}` });
      }
    }

    const byPM = {};
    let totalIngresos = 0, totalEgresos = 0;
    for (const m of METHODS) {
      const ing = parseFloat(manual_breakdown[m].ingresos || 0);
      const egr = parseFloat(manual_breakdown[m].egresos  || 0);
      byPM[m.toUpperCase()] = { ingresos: round2(ing), egresos: round2(egr) };
      totalIngresos += ing;
      totalEgresos  += egr;
    }

    const balanceFinal = round2(parseFloat(session.opening_amount) + totalIngresos - totalEgresos);
    closingAmt = balanceFinal;

    closeBreakdown = {
      type:            'manual',
      role,
      payment_methods: byPM,
      apertura:        parseFloat(session.opening_amount),
      total_ingresos:  round2(totalIngresos),
      total_egresos:   round2(totalEgresos),
      balance_final:   balanceFinal,
    };

    // Calcular también el recuento automático para poder comparar luego en "Recuentos"
    try {
      const autoData = await calcBreakdownForSession(session, req.user.company_id);
      closeBreakdown.auto_breakdown = {
        ingresos_por_metodo: autoData.ingresos_por_metodo,
        egresos_por_metodo:  autoData.egresos_por_metodo,
        manual_in:           autoData.manual_in,
        manual_out:          autoData.manual_out,
        total_ingresos:      autoData.total_ingresos,
        total_egresos:       autoData.total_egresos,
        balance_final:       autoData.balance_final,
      };
    } catch {
      // no-crítico: el cierre continúa aunque falle el cálculo automático
    }
  }

  const totals = await calcSessionTotals(session.id);
  const expectedAmount = round2(
    parseFloat(session.opening_amount) +
    totals.sales + totals.manual_in - totals.expenses - totals.manual_out
  );
  const difference = round2(closingAmt - expectedAmount);

  const { data, error } = await supabase
    .from('cash_sessions')
    .update({
      closing_amount:  closingAmt,
      expected_amount: expectedAmount,
      difference,
      close_breakdown: closeBreakdown,
      status:          'closed',
      closed_by:       req.user.id,
      closed_at:       new Date().toISOString(),
      notes:           notes ? (session.notes ? session.notes + ' | ' + notes : notes).trim() : session.notes,
    })
    .eq('id', session.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── GET /api/cash/recuentos — Comparativa auto vs manual (dueño) ──
router.get('/recuentos', authenticate, requireRole('dueno'), async (req, res) => {
  const { from, to, branch_id } = req.query;

  let query = supabase
    .from('cash_sessions')
    .select('id, opened_at, closed_at, opening_amount, closing_amount, expected_amount, difference, close_breakdown, branch_id, opened_by, closed_by, branches(name), opener:users!opened_by(name), closer:users!closed_by(name)')
    .eq('company_id', req.user.company_id)
    .eq('status', 'closed')
    .not('close_breakdown', 'is', null)
    .order('closed_at', { ascending: false });

  if (branch_id) query = query.eq('branch_id', branch_id);
  if (from)      query = query.gte('closed_at', from);
  if (to)        query = query.lte('closed_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const result = (data ?? [])
    .filter(s => s.close_breakdown?.type === 'manual')
    .map(s => {
      const manual = s.close_breakdown;
      const auto   = manual.auto_breakdown ?? null;
      const balanceDiff = auto !== null
        ? round2(auto.balance_final - manual.balance_final)
        : null;
      return {
        id:               s.id,
        opened_at:        s.opened_at,
        closed_at:        s.closed_at,
        branch_name:      s.branches?.name  ?? null,
        opened_by_name:   s.opener?.name    ?? null,
        closed_by_name:   s.closer?.name    ?? null,
        closed_by_role:   manual.role       ?? null,
        opening_amount:   parseFloat(s.opening_amount),
        expected_amount:  s.expected_amount,
        closing_amount:   s.closing_amount,
        difference:       s.difference,
        manual_breakdown: manual,
        auto_breakdown:   auto,
        balance_diff:     balanceDiff,
      };
    });

  res.json(result);
});

// ── GET /api/cash/status — Estado actual de caja ─────────────
router.get('/status', authenticate, requireRole(...CASH_ROLES), async (req, res) => {
  const branchId = req.user.branch_id;
  if (!branchId) return res.json({ session: null, summary: null });

  const session = await getOpenSession(branchId);
  if (!session) return res.json({ session: null, summary: null });

  // Enrich with opener name
  const { data: opener } = await supabase
    .from('users')
    .select('name')
    .eq('id', session.opened_by)
    .maybeSingle();

  const totals = await calcSessionTotals(session.id);
  const expectedAmount =
    parseFloat(session.opening_amount) +
    totals.sales +
    totals.manual_in -
    totals.expenses -
    totals.manual_out;

  res.json({
    session: {
      ...session,
      opened_by_name: opener?.name ?? null,
    },
    summary: {
      sales_total:     totals.sales,
      expenses_total:  totals.expenses,
      manual_in_total: totals.manual_in,
      manual_out_total: totals.manual_out,
      expected_amount: Math.round(expectedAmount * 100) / 100,
    },
  });
});

// ── GET /api/cash/arqueo — Arqueo en tiempo real ─────────────
router.get('/arqueo', authenticate, requireRole(...CASH_ROLES), async (req, res) => {
  const branchId = req.user.branch_id;
  if (!branchId) return res.status(404).json({ error: 'Usuario sin sucursal asignada' });

  const session = await getOpenSession(branchId);
  if (!session) return res.status(404).json({ error: 'No hay sesión de caja abierta en esta sucursal' });

  const { data: movements, error } = await supabase
    .from('cash_movements')
    .select('*, users!created_by(name)')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const totals = { sales: 0, expenses: 0, manual_in: 0, manual_out: 0 };
  for (const m of movements ?? []) {
    if (m.type === 'sale')       totals.sales      += parseFloat(m.amount);
    if (m.type === 'expense')    totals.expenses   += parseFloat(m.amount);
    if (m.type === 'manual_in')  totals.manual_in  += parseFloat(m.amount);
    if (m.type === 'manual_out') totals.manual_out += parseFloat(m.amount);
  }

  const expectedAmount =
    parseFloat(session.opening_amount) +
    totals.sales +
    totals.manual_in -
    totals.expenses -
    totals.manual_out;

  res.json({
    session_id:      session.id,
    opening_amount:  parseFloat(session.opening_amount),
    sales_total:     totals.sales,
    expenses_total:  totals.expenses,
    manual_in:       totals.manual_in,
    manual_out:      totals.manual_out,
    expected_amount: Math.round(expectedAmount * 100) / 100,
    movements: (movements ?? []).map((m) => ({
      id:          m.id,
      type:        m.type,
      amount:      parseFloat(m.amount),
      description: m.description,
      created_by_name: m.users?.name ?? null,
      created_at:  m.created_at,
    })),
  });
});

// ── GET /api/cash/sessions — Historial de sesiones ───────────
router.get('/sessions', authenticate, requireRole(...MANAGER_ROLES), async (req, res) => {
  const { from, to, branch_id } = req.query;

  let query = supabase
    .from('cash_sessions')
    .select('*, branches(name), opener:users!opened_by(name), closer:users!closed_by(name)')
    .eq('company_id', req.user.company_id)
    .order('opened_at', { ascending: false });

  // encargado can only see their own branch
  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  if (from) query = query.gte('opened_at', from);
  if (to)   query = query.lte('opened_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const result = (data ?? []).map((s) => ({
    ...s,
    branch_name:     s.branches?.name ?? null,
    opened_by_name:  s.opener?.name   ?? null,
    closed_by_name:  s.closer?.name   ?? null,
  }));

  res.json(result);
});

// ── GET /api/cash/sessions/:id — Detalle de una sesión ───────
router.get('/sessions/:id', authenticate, requireRole(...MANAGER_ROLES), async (req, res) => {
  const { data: session, error: sessErr } = await supabase
    .from('cash_sessions')
    .select('*, branches(name), opener:users!opened_by(name), closer:users!closed_by(name)')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (sessErr || !session) return res.status(404).json({ error: 'Sesión no encontrada' });

  const { data: movements } = await supabase
    .from('cash_movements')
    .select('*, users!created_by(name)')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  res.json({
    session: {
      ...session,
      branch_name:    session.branches?.name  ?? null,
      opened_by_name: session.opener?.name    ?? null,
      closed_by_name: session.closer?.name    ?? null,
    },
    movements: (movements ?? []).map((m) => ({
      id:              m.id,
      type:            m.type,
      amount:          parseFloat(m.amount),
      description:     m.description,
      created_by_name: m.users?.name ?? null,
      created_at:      m.created_at,
    })),
  });
});

// ── POST /api/cash/movements — Movimiento manual ─────────────
router.post('/movements', authenticate, requireRole(...CASH_ROLES), async (req, res) => {
  const { type, amount, description } = req.body;

  if (!type || !['manual_in', 'manual_out'].includes(type)) {
    return res.status(400).json({ error: 'type debe ser manual_in o manual_out' });
  }
  if (amount === undefined || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'amount debe ser un número mayor a 0' });
  }

  const branchId = req.user.branch_id;
  if (!branchId) return res.status(400).json({ error: 'Usuario sin sucursal asignada' });

  const session = await getOpenSession(branchId);
  if (!session) return res.status(404).json({ error: 'No hay sesión de caja abierta en esta sucursal' });

  const { data, error } = await supabase
    .from('cash_movements')
    .insert([{
      session_id:  session.id,
      company_id:  req.user.company_id,
      branch_id:   branchId,
      type,
      amount:      parseFloat(amount),
      description: (description || '').trim(),
      created_by:  req.user.id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── GET /api/cash/movements — Listado con filtros ────────────
router.get('/movements', authenticate, requireRole(...MANAGER_ROLES), async (req, res) => {
  const { from, to, branch_id, type, session_id } = req.query;

  let query = supabase
    .from('cash_movements')
    .select('*, branches(name), users!created_by(name)')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  if (session_id) query = query.eq('session_id', session_id);
  if (type)       query = query.eq('type', type);
  if (from)       query = query.gte('created_at', from);
  if (to)         query = query.lte('created_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data ?? []).map((m) => ({
    ...m,
    amount:          parseFloat(m.amount),
    branch_name:     m.branches?.name ?? null,
    created_by_name: m.users?.name    ?? null,
  })));
});

// ── GET /api/cash/movements/summary — Resumen agrupado ───────
router.get('/movements/summary', authenticate, requireRole(...MANAGER_ROLES), async (req, res) => {
  const { from, to, branch_id, type, session_id } = req.query;

  let query = supabase
    .from('cash_movements')
    .select('type, amount')
    .eq('company_id', req.user.company_id);

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  if (session_id) query = query.eq('session_id', session_id);
  if (type)       query = query.eq('type', type);
  if (from)       query = query.gte('created_at', from);
  if (to)         query = query.lte('created_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const byType = { sale: 0, expense: 0, manual_in: 0, manual_out: 0 };
  for (const m of data ?? []) {
    byType[m.type] = (byType[m.type] ?? 0) + parseFloat(m.amount);
  }

  const totalIn  = byType.sale + byType.manual_in;
  const totalOut = byType.expense + byType.manual_out;

  res.json({
    total_in:  Math.round(totalIn  * 100) / 100,
    total_out: Math.round(totalOut * 100) / 100,
    balance:   Math.round((totalIn - totalOut) * 100) / 100,
    by_type:   Object.fromEntries(
      Object.entries(byType).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
  });
});

module.exports = router;
