const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/categories — list all categories for the company
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('company_id', req.user.company_id)
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/categories
router.post('/', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name: name.trim(), company_id: req.user.company_id }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/categories/:id
router.put('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const { data, error } = await supabase
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/categories/:id — products in this category get category_id = NULL via FK ON DELETE SET NULL
router.delete('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Category deleted' });
});

module.exports = router;
