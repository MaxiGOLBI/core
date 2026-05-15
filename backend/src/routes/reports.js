'use strict';

// Financial reports — only dueno has access [SFT]
const { Router } = require('express');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();
const OWNER = requireRole('dueno');

// ── Helpers ────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

// Build a map of date → zero-valued bucket for every day in [from, to]
function buildDateBuckets(from, to) {
  const buckets = {};
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const key = cur.toISOString().split('T')[0];
    buckets[key] = { date: key, sales: 0, expenses: 0, manual_in: 0, manual_out: 0 };
    cur.setDate(cur.getDate() + 1);
  }
  return buckets;
}

// ── GET /api/reports/cash-flow ────────────────────────────────
// Query: ?from=YYYY-MM-DD &to=YYYY-MM-DD &branch_id=uuid
// Returns daily breakdown of ingresos vs egresos + saldo acumulado
router.get('/cash-flow', authenticate, OWNER, async (req, res) => {
  const from = req.query.from || monthStartStr();
  const to   = req.query.to   || todayStr();
  const { branch_id } = req.query;

  const toEnd = to + 'T23:59:59Z';

  // ── 1. Sales (ingresos por ventas) ──────────────────────────
  let salesQuery = supabase
    .from('sales')
    .select('date, total')
    .eq('company_id', req.user.company_id)
    .eq('status', 'completed')
    .gte('date', from)
    .lte('date', to);

  if (branch_id) salesQuery = salesQuery.eq('branch_id', branch_id);

  // ── 2. Expenses (egresos) ───────────────────────────────────
  let expQuery = supabase
    .from('expenses')
    .select('expense_date, amount')
    .eq('company_id', req.user.company_id)
    .gte('expense_date', from)
    .lte('expense_date', to);

  // ── 3. Manual cash movements ────────────────────────────────
  let movQuery = supabase
    .from('cash_movements')
    .select('type, amount, created_at')
    .eq('company_id', req.user.company_id)
    .in('type', ['manual_in', 'manual_out'])
    .gte('created_at', from)
    .lte('created_at', toEnd);

  if (branch_id) movQuery = movQuery.eq('branch_id', branch_id);

  const [salesRes, expRes, movRes] = await Promise.all([salesQuery, expQuery, movQuery]);

  if (salesRes.error) return res.status(500).json({ error: salesRes.error.message });
  if (expRes.error)   return res.status(500).json({ error: expRes.error.message });
  if (movRes.error)   return res.status(500).json({ error: movRes.error.message });

  // ── Build daily buckets ──────────────────────────────────────
  const buckets = buildDateBuckets(from, to);

  for (const s of salesRes.data ?? []) {
    const key = (s.date || '').slice(0, 10);
    if (buckets[key]) buckets[key].sales += parseFloat(s.total || 0);
  }

  for (const e of expRes.data ?? []) {
    const key = (e.expense_date || '').slice(0, 10);
    if (buckets[key]) buckets[key].expenses += parseFloat(e.amount || 0);
  }

  for (const m of movRes.data ?? []) {
    const key = (m.created_at || '').slice(0, 10);
    if (buckets[key]) buckets[key][m.type] += parseFloat(m.amount || 0);
  }

  // ── Compute net + cumulative balance ────────────────────────
  let cumulative = 0;
  const byDate = Object.values(buckets).map((b) => {
    const inflow  = b.sales + b.manual_in;
    const outflow = b.expenses + b.manual_out;
    const net     = inflow - outflow;
    cumulative   += net;
    return {
      date:               b.date,
      sales:              round2(b.sales),
      expenses:           round2(b.expenses),
      manual_in:          round2(b.manual_in),
      manual_out:         round2(b.manual_out),
      in:                 round2(inflow),
      out:                round2(outflow),
      net:                round2(net),
      cumulative_balance: round2(cumulative),
    };
  });

  // ── Summary totals ───────────────────────────────────────────
  const totalSales     = byDate.reduce((s, d) => s + d.sales,      0);
  const totalExpenses  = byDate.reduce((s, d) => s + d.expenses,   0);
  const totalManualIn  = byDate.reduce((s, d) => s + d.manual_in,  0);
  const totalManualOut = byDate.reduce((s, d) => s + d.manual_out, 0);
  const totalIn        = totalSales + totalManualIn;
  const totalOut       = totalExpenses + totalManualOut;

  res.json({
    from,
    to,
    summary: {
      total_sales:     round2(totalSales),
      total_expenses:  round2(totalExpenses),
      total_manual_in: round2(totalManualIn),
      total_manual_out:round2(totalManualOut),
      total_in:        round2(totalIn),
      total_out:       round2(totalOut),
      net:             round2(totalIn - totalOut),
    },
    by_date: byDate,
  });
});

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ── GET /api/reports/income-statement ────────────────────────
// Ingresos - CMV - Gastos + Otros Ingresos = Resultado
// Query: ?from=YYYY-MM-DD &to=YYYY-MM-DD &branch_id=uuid
router.get('/income-statement', authenticate, OWNER, async (req, res) => {
  const from = req.query.from || monthStartStr();
  const to   = req.query.to   || todayStr();
  const { branch_id } = req.query;

  // ── 1. Sales (completed only) ───────────────────────────────
  let salesQ = supabase
    .from('sales')
    .select('total, details_json')
    .eq('company_id', req.user.company_id)
    .eq('status', 'completed')
    .gte('date', from)
    .lte('date', to);
  if (branch_id) salesQ = salesQ.eq('branch_id', branch_id);

  // ── 2. Expenses (gastos only) ───────────────────────────────
  let expQ = supabase
    .from('expenses')
    .select('amount')
    .eq('company_id', req.user.company_id)
    .eq('type', 'gasto')
    .gte('expense_date', from)
    .lte('expense_date', to);

  // ── 3. Other income (ingresos) ──────────────────────────────
  let incQ = supabase
    .from('expenses')
    .select('amount')
    .eq('company_id', req.user.company_id)
    .eq('type', 'ingreso')
    .gte('expense_date', from)
    .lte('expense_date', to);

  const [salesRes, expRes, incRes] = await Promise.all([salesQ, expQ, incQ]);
  if (salesRes.error) return res.status(500).json({ error: salesRes.error.message });
  if (expRes.error)   return res.status(500).json({ error: expRes.error.message });
  if (incRes.error)   return res.status(500).json({ error: incRes.error.message });

  // ── Compute revenue ──────────────────────────────────────────
  const totalRevenue    = (salesRes.data ?? []).reduce((s, r) => s + parseFloat(r.total || 0), 0);
  const totalOtherIncome= (incRes.data   ?? []).reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const totalExpenses   = (expRes.data   ?? []).reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  // ── Compute COGS (Costo de Mercadería Vendida) ───────────────
  // Collect all product_ids from sold items
  const productIds = new Set();
  for (const sale of salesRes.data ?? []) {
    for (const item of sale.details_json ?? []) {
      if (item.product_id) productIds.add(item.product_id);
    }
  }

  let costMap = {};
  if (productIds.size > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, cost_price')
      .in('id', [...productIds]);
    (products ?? []).forEach((p) => { costMap[p.id] = parseFloat(p.cost_price || 0); });
  }

  let cogs = 0;
  for (const sale of salesRes.data ?? []) {
    for (const item of sale.details_json ?? []) {
      if (item.product_id && costMap[item.product_id] !== undefined) {
        cogs += (costMap[item.product_id] * parseInt(item.qty || 1));
      }
    }
  }

  // ── P&L calculation ──────────────────────────────────────────
  const grossProfit  = totalRevenue - cogs;
  const operResult   = grossProfit - totalExpenses + totalOtherIncome;
  const grossMargin  = totalRevenue > 0 ? round2((grossProfit / totalRevenue) * 100) : 0;
  const netMargin    = totalRevenue > 0 ? round2((operResult  / totalRevenue) * 100) : 0;

  res.json({
    from,
    to,
    revenue: {
      sales:        round2(totalRevenue),
      other_income: round2(totalOtherIncome),
      total:        round2(totalRevenue + totalOtherIncome),
    },
    costs: {
      cogs:     round2(cogs),
      expenses: round2(totalExpenses),
      total:    round2(cogs + totalExpenses),
    },
    gross_profit:  round2(grossProfit),
    gross_margin:  grossMargin,
    result:        round2(operResult),
    net_margin:    netMargin,
  });
});

// ── GET /api/reports/stock-valuation ─────────────────────────
// SUM(stock * cost_price) grouped by branch and category
// Query: ?branch_id=uuid
router.get('/stock-valuation', authenticate, OWNER, async (req, res) => {
  const { branch_id } = req.query;

  let query = supabase
    .from('products')
    .select('branch_id, category_id, stock, cost_price, branches(name), categories(name)')
    .eq('company_id', req.user.company_id)
    .gt('stock', 0);

  if (branch_id) query = query.eq('branch_id', branch_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Group by branch
  const byBranch = {};
  let totalValue = 0;

  for (const p of data ?? []) {
    const bId   = p.branch_id   || 'sin-sucursal';
    const bName = p.branches?.name || 'Sin sucursal';
    const catId = p.category_id || 'sin-categoria';
    const catName = p.categories?.name || 'Sin categoría';
    const value = parseFloat(p.cost_price || 0) * parseInt(p.stock || 0);

    if (!byBranch[bId]) byBranch[bId] = { branch_id: bId, branch_name: bName, total: 0, by_category: {} };

    byBranch[bId].total += value;
    totalValue          += value;

    if (!byBranch[bId].by_category[catId]) {
      byBranch[bId].by_category[catId] = { category_id: catId, category_name: catName, value: 0, units: 0 };
    }
    byBranch[bId].by_category[catId].value += value;
    byBranch[bId].by_category[catId].units += parseInt(p.stock || 0);
  }

  // Flatten category maps to arrays
  const branches = Object.values(byBranch).map((b) => ({
    ...b,
    total:       round2(b.total),
    by_category: Object.values(b.by_category).map((c) => ({
      ...c,
      value: round2(c.value),
    })),
  }));

  res.json({
    total_value: round2(totalValue),
    branches,
  });
});

// ── GET /api/reports/sales-by-category ───────────────────────
// Revenue and units sold grouped by product category
// Query: ?from=YYYY-MM-DD &to=YYYY-MM-DD &branch_id=uuid
router.get('/sales-by-category', authenticate, OWNER, async (req, res) => {
  const from = req.query.from || monthStartStr();
  const to   = req.query.to   || todayStr();
  const { branch_id } = req.query;

  let salesQ = supabase
    .from('sales')
    .select('total, details_json')
    .eq('company_id', req.user.company_id)
    .eq('status', 'completed')
    .gte('date', from)
    .lte('date', to);
  if (branch_id) salesQ = salesQ.eq('branch_id', branch_id);

  const { data: sales, error } = await salesQ;
  if (error) return res.status(500).json({ error: error.message });

  // Collect all product_ids to fetch category info
  const productIds = new Set();
  for (const sale of sales ?? []) {
    for (const item of sale.details_json ?? []) {
      if (item.product_id) productIds.add(item.product_id);
    }
  }

  let productMap = {};
  if (productIds.size > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, category_id, categories(name)')
      .in('id', [...productIds]);
    (products ?? []).forEach((p) => {
      productMap[p.id] = {
        category_id:   p.category_id   || 'sin-categoria',
        category_name: p.categories?.name || 'Sin categoría',
      };
    });
  }

  // Aggregate by category
  const byCategory = {};
  let grandTotal = 0;
  let grandUnits = 0;

  for (const sale of sales ?? []) {
    for (const item of sale.details_json ?? []) {
      if (!item.product_id) continue;
      const cat = productMap[item.product_id] ?? { category_id: 'sin-categoria', category_name: 'Sin categoría' };
      const qty     = parseInt(item.qty    || 1);
      const subtotal= parseFloat(item.price || 0) * qty;

      if (!byCategory[cat.category_id]) {
        byCategory[cat.category_id] = {
          category_id:   cat.category_id,
          category_name: cat.category_name,
          total:  0,
          units:  0,
          sales_count: 0,
        };
      }
      byCategory[cat.category_id].total += subtotal;
      byCategory[cat.category_id].units += qty;
      grandTotal += subtotal;
      grandUnits += qty;
    }
  }

  const categories = Object.values(byCategory)
    .map((c) => ({
      ...c,
      total:      round2(c.total),
      share_pct:  grandTotal > 0 ? round2((c.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  res.json({
    from,
    to,
    grand_total: round2(grandTotal),
    grand_units: grandUnits,
    categories,
  });
});

module.exports = router;
