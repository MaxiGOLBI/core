const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/discounts
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('discounts').select('*').eq('company_id', req.user.company_id).order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/discounts
router.post('/', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { name, rule_json, active } = req.body;

  if (!name || !rule_json) {
    return res.status(400).json({ error: 'name and rule_json are required' });
  }

  const { data, error } = await supabase
    .from('discounts')
    .insert([{ name, rule_json, active: active ?? true, company_id: req.user.company_id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/discounts/:id
router.put('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { name, rule_json, active } = req.body;

  const { data, error } = await supabase
    .from('discounts')
    .update({ name, rule_json, active })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/discounts/:id
router.delete('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { error } = await supabase.from('discounts').delete().eq('id', req.params.id).eq('company_id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Discount deleted' });
});

module.exports = router;
