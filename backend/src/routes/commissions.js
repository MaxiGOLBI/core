const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/commissions — list commission rules per product
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('commissions')
    .select('*, products(name, code)')
    .order('product_id');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/commissions
router.post('/', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { product_id, commission_per_unit, active } = req.body;

  if (!product_id || commission_per_unit == null) {
    return res.status(400).json({ error: 'product_id and commission_per_unit are required' });
  }

  const { data, error } = await supabase
    .from('commissions')
    .insert([{ product_id, commission_per_unit, active: active ?? true }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/commissions/:id
router.put('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { commission_per_unit, active } = req.body;

  const { data, error } = await supabase
    .from('commissions')
    .update({ commission_per_unit, active })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/commissions/:id
router.delete('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { error } = await supabase.from('commissions').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Commission deleted' });
});

// GET /api/commissions/balances — show current balances per seller
router.get('/balances', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, commission_balance')
    .eq('role', 'vendedor')
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
