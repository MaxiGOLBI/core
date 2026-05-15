const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/clients — supports ?with_balance=true to filter clients with outstanding debt
router.get('/', authenticate, async (req, res) => {
  let query = supabase
    .from('clients')
    .select('*')
    .eq('company_id', req.user.company_id)
    .order('name');

  if (req.query.with_balance === 'true') query = query.gt('balance', 0);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/clients
router.post('/', authenticate, requireRole('vendedor', 'encargado', 'dueno', 'cajero'), async (req, res) => {
  const { name, discount_rules } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabase
    .from('clients')
    .insert([{ name, discount_rules: discount_rules ?? {}, company_id: req.user.company_id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/clients/:id
router.put('/:id', authenticate, requireRole('vendedor', 'encargado', 'dueno', 'cajero'), async (req, res) => {
  const { name, discount_rules } = req.body;

  const { data, error } = await supabase
    .from('clients')
    .update({ name, discount_rules })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/clients/:id
router.delete('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { error } = await supabase.from('clients').delete().eq('id', req.params.id).eq('company_id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Client deleted' });
});

// ── GET /api/clients/:id/transactions — ledger history ───────
router.get('/:id/transactions', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { from, to } = req.query;

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, balance')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  let query = supabase
    .from('client_transactions')
    .select('*, users!created_by(name)')
    .eq('client_id', req.params.id)
    .eq('company_id', req.user.company_id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (from) query = query.gte('date', from);
  if (to)   query = query.lte('date', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({
    client,
    transactions: (data ?? []).map((t) => ({
      ...t,
      created_by_name: t.users?.name ?? null,
    })),
  });
});

// ── POST /api/clients/:id/transactions — register debt or payment
// type: 'deuda' → client owes us more (increases balance)
// type: 'pago'  → client paid (decreases balance)
router.post('/:id/transactions', authenticate, requireRole('cajero', 'encargado', 'dueno'), async (req, res) => {
  const { type, amount, date, description } = req.body;

  if (!['deuda', 'pago', 'nota_credito'].includes(type)) {
    return res.status(400).json({ error: 'type debe ser deuda, pago o nota_credito' });
  }
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'amount debe ser un número mayor a 0' });
  }

  const { data: client, error: cErr } = await supabase
    .from('clients')
    .select('id, balance')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (cErr || !client) return res.status(404).json({ error: 'Cliente no encontrado' });

  const amt = parseFloat(amount);
  const currentBalance = parseFloat(client.balance);
  const newBalance = type === 'deuda'
    ? currentBalance + amt
    : currentBalance - amt;

  const { data: tx, error: txErr } = await supabase
    .from('client_transactions')
    .insert([{
      company_id:  req.user.company_id,
      client_id:   req.params.id,
      type,
      amount:      amt,
      date:        date || new Date().toISOString().split('T')[0],
      description: (description || '').trim(),
      created_by:  req.user.id,
    }])
    .select()
    .single();

  if (txErr) return res.status(500).json({ error: txErr.message });

  const { data: updated, error: balErr } = await supabase
    .from('clients')
    .update({ balance: Math.round(newBalance * 100) / 100 })
    .eq('id', req.params.id)
    .select()
    .single();

  if (balErr) return res.status(500).json({ error: balErr.message });

  res.status(201).json({ transaction: tx, client: updated });
});

module.exports = router;
