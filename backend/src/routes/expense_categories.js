const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const OWNER = requireRole('dueno');

// GET /api/expense-categories
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, name, color')
    .eq('company_id', req.user.company_id)
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// POST /api/expense-categories
router.post('/', authenticate, OWNER, async (req, res) => {
  const { name, color = 'slate' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const { data, error } = await supabase
    .from('expense_categories')
    .insert([{ company_id: req.user.company_id, name: name.trim(), color }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/expense-categories/:id
router.put('/:id', authenticate, OWNER, async (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const updates = { name: name.trim() };
  if (color) updates.color = color;
  const { data, error } = await supabase
    .from('expense_categories')
    .update(updates)
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/expense-categories/:id
router.delete('/:id', authenticate, OWNER, async (req, res) => {
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

module.exports = router;
