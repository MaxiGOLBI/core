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

// Generates a unique random 6-digit code [SF]
async function generateUniqueCode() {
  let code;
  let exists = true;
  while (exists) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    exists = !!data;
  }
  return code;
}

// POST /api/products — encargado/dueno only
router.post('/', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { name, price, stock, commission_default } = req.body;

  if (!name || price == null || stock == null) {
    return res.status(400).json({ error: 'name, price and stock are required' });
  }

  const code = await generateUniqueCode();

  const { data, error } = await supabase
    .from('products')
    .insert([{ code, name, price, stock, commission_default: commission_default ?? 0 }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/products/:id — code is immutable [SF]
router.put('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;
  const { name, price, stock, commission_default } = req.body;

  const update = {};
  if (name !== undefined) update.name = name;
  if (price !== undefined) update.price = price;
  if (stock !== undefined) update.stock = parseInt(stock);
  if (commission_default !== undefined) update.commission_default = commission_default;

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('products')
    .update(update)
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
