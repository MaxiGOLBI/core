const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/products
router.get('/', authenticate, async (req, res) => {
  let query = supabase
    .from('products')
    .select('*, categories(id, name)')
    .eq('company_id', req.user.company_id)
    .order('name');

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (req.query.branch_id) {
    query = query.eq('branch_id', req.query.branch_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Generates a unique random 6-digit code scoped to the company [SF]
async function generateUniqueCode(company_id) {
  let code;
  let exists = true;
  while (exists) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('code', code)
      .eq('company_id', company_id)
      .maybeSingle();
    exists = !!data;
  }
  return code;
}

// POST /api/products — encargado/dueno only
router.post('/', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { name, price, cost_price, stock, commission_default, category_id, branch_id, sku } = req.body;

  if (!name || price == null || stock == null) {
    return res.status(400).json({ error: 'name, price and stock are required' });
  }

  // dueno must specify branch_id; encargado uses their own branch [IV]
  const targetBranch = req.user.role === 'dueno' ? branch_id : req.user.branch_id;
  if (!targetBranch) {
    return res.status(400).json({ error: 'branch_id es requerido' });
  }

  const code = await generateUniqueCode(req.user.company_id);

  const { data, error } = await supabase
    .from('products')
    .insert([{
      code, name, price,
      cost_price: cost_price ?? 0,
      stock,
      commission_default: commission_default ?? 0,
      category_id: category_id ?? null,
      sku: sku ?? null,
      company_id: req.user.company_id,
      branch_id: targetBranch,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/products/:id — code is immutable [SF]
router.put('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;
  const { name, price, cost_price, stock, commission_default, category_id, sku } = req.body;

  const update = {};
  if (name !== undefined) update.name = name;
  if (price !== undefined) update.price = price;
  if (cost_price !== undefined) update.cost_price = cost_price;
  if (stock !== undefined) update.stock = parseInt(stock);
  if (commission_default !== undefined) update.commission_default = commission_default;
  if (category_id !== undefined) update.category_id = category_id ?? null;
  if (sku !== undefined) update.sku = sku || null;

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('products')
    .update(update)
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from('products').delete().eq('id', id).eq('company_id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Product deleted' });
});

module.exports = router;
