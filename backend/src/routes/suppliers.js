'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();
const OWNER = requireRole('dueno');
const MANAGER = requireRole('encargado', 'dueno');

// ── GET /api/suppliers — list all suppliers ───────────────────
router.get('/', authenticate, MANAGER, async (req, res) => {
  const { with_balance } = req.query;

  let query = supabase
    .from('suppliers')
    .select('*')
    .eq('company_id', req.user.company_id)
    .order('name');

  // ?with_balance=true → only suppliers that have outstanding balance
  if (with_balance === 'true') {
    query = query.gt('balance', 0);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── GET /api/suppliers/:id — single supplier with transactions ─
router.get('/:id', authenticate, MANAGER, async (req, res) => {
  const { data: supplier, error: supErr } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (supErr || !supplier) return res.status(404).json({ error: 'Proveedor no encontrado' });

  const { data: transactions } = await supabase
    .from('supplier_transactions')
    .select('*, users!created_by(name)')
    .eq('supplier_id', req.params.id)
    .eq('company_id', req.user.company_id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  res.json({
    ...supplier,
    transactions: (transactions ?? []).map((t) => ({
      ...t,
      created_by_name: t.users?.name ?? null,
    })),
  });
});

// ── POST /api/suppliers — create supplier ────────────────────
router.post('/', authenticate, OWNER, async (req, res) => {
  const { name, cuit, phone, email, address, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name es requerido' });
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert([{
      company_id: req.user.company_id,
      name:       name.trim(),
      cuit:       (cuit    || '').trim(),
      phone:      (phone   || '').trim(),
      email:      (email   || '').trim(),
      address:    (address || '').trim(),
      notes:      (notes   || '').trim(),
      balance:    0,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── PUT /api/suppliers/:id — update supplier data ─────────────
router.put('/:id', authenticate, OWNER, async (req, res) => {
  const { name, cuit, phone, email, address, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name es requerido' });
  }

  const { data, error } = await supabase
    .from('suppliers')
    .update({
      name:    name.trim(),
      cuit:    (cuit    || '').trim(),
      phone:   (phone   || '').trim(),
      email:   (email   || '').trim(),
      address: (address || '').trim(),
      notes:   (notes   || '').trim(),
    })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json(data);
});

// ── DELETE /api/suppliers/:id — delete supplier ───────────────
router.delete('/:id', authenticate, OWNER, async (req, res) => {
  // Prevent deletion if supplier has balance
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('balance')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!supplier) return res.status(404).json({ error: 'Proveedor no encontrado' });
  if (parseFloat(supplier.balance) !== 0) {
    return res.status(409).json({ error: 'No se puede eliminar un proveedor con saldo pendiente' });
  }

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Proveedor eliminado' });
});

// ── POST /api/suppliers/:id/transactions — register debt or payment
// type: 'deuda' → increases balance (we owe them)
// type: 'pago'  → decreases balance (we paid them)
router.post('/:id/transactions', authenticate, OWNER, async (req, res) => {
  const { type, amount, date, payment_method, reference, notes } = req.body;

  if (!['deuda', 'pago'].includes(type)) {
    return res.status(400).json({ error: 'type debe ser deuda o pago' });
  }
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'amount debe ser un número mayor a 0' });
  }

  const { data: supplier, error: supErr } = await supabase
    .from('suppliers')
    .select('id, balance')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (supErr || !supplier) return res.status(404).json({ error: 'Proveedor no encontrado' });

  const amt = parseFloat(amount);
  const currentBalance = parseFloat(supplier.balance);
  const newBalance = type === 'deuda'
    ? currentBalance + amt
    : currentBalance - amt;

  // Insert transaction and update balance atomically via sequential awaits [REH]
  const { data: tx, error: txErr } = await supabase
    .from('supplier_transactions')
    .insert([{
      company_id:     req.user.company_id,
      supplier_id:    req.params.id,
      type,
      amount:         amt,
      date:           date || new Date().toISOString().split('T')[0],
      payment_method: payment_method || null,
      reference:      (reference || '').trim(),
      notes:          (notes     || '').trim(),
      created_by:     req.user.id,
    }])
    .select()
    .single();

  if (txErr) return res.status(500).json({ error: txErr.message });

  const { data: updated, error: balErr } = await supabase
    .from('suppliers')
    .update({ balance: Math.round(newBalance * 100) / 100 })
    .eq('id', req.params.id)
    .select()
    .single();

  if (balErr) return res.status(500).json({ error: balErr.message });

  res.status(201).json({ transaction: tx, supplier: updated });
});

// ── GET /api/suppliers/:id/transactions — transaction history ─
router.get('/:id/transactions', authenticate, MANAGER, async (req, res) => {
  const { from, to } = req.query;

  // Verify supplier belongs to this company
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, name, balance')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!supplier) return res.status(404).json({ error: 'Proveedor no encontrado' });

  let query = supabase
    .from('supplier_transactions')
    .select('*, users!created_by(name)')
    .eq('supplier_id', req.params.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (from) query = query.gte('date', from);
  if (to)   query = query.lte('date', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({
    supplier,
    transactions: (data ?? []).map((t) => ({
      ...t,
      created_by_name: t.users?.name ?? null,
    })),
  });
});

module.exports = router;
