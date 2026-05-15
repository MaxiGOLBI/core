const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const OWNER = requireRole('dueno');

// GET /api/payment-methods — all active methods for this company
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name, commission_pct, active, sort_order')
    .eq('company_id', req.user.company_id)
    .order('sort_order')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// POST /api/payment-methods
router.post('/', authenticate, OWNER, async (req, res) => {
  const { name, commission_pct = 0, active = true } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  // Count existing to set sort_order
  const { count } = await supabase
    .from('payment_methods')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', req.user.company_id);

  const { data, error } = await supabase
    .from('payment_methods')
    .insert([{
      company_id:     req.user.company_id,
      name:           name.trim(),
      commission_pct: parseFloat(commission_pct) || 0,
      active:         active !== false,
      sort_order:     count ?? 0,
    }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/payment-methods/:id
router.put('/:id', authenticate, OWNER, async (req, res) => {
  const { name, commission_pct, active } = req.body;
  const updates = {};
  if (name !== undefined)           updates.name           = name.trim();
  if (commission_pct !== undefined) updates.commission_pct = parseFloat(commission_pct) || 0;
  if (active !== undefined)         updates.active         = active;

  const { data, error } = await supabase
    .from('payment_methods')
    .update(updates)
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/payment-methods/:id
router.delete('/:id', authenticate, OWNER, async (req, res) => {
  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

module.exports = router;
