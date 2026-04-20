const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/products
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/products — encargado/dueno only
router.post('/', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { code, name, price, stock, commission_default } = req.body;

  if (!code || !name || price == null || stock == null) {
    return res.status(400).json({ error: 'code, name, price and stock are required' });
  }

  const { data, error } = await supabase
    .from('products')
    .insert([{ code, name, price, stock, commission_default: commission_default ?? 0 }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/products/:id
router.put('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;
  const { code, name, price, stock, commission_default } = req.body;

  const { data, error } = await supabase
    .from('products')
    .update({ code, name, price, stock, commission_default })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Product deleted' });
});

module.exports = router;
