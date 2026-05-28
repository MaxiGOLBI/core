const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// Stock threshold constants [CMV]
const STOCK_THRESHOLD_GREEN = 50;
const STOCK_THRESHOLD_YELLOW = 15;

function stockLevel(qty) {
  if (qty > STOCK_THRESHOLD_GREEN) return 'green';
  if (qty > STOCK_THRESHOLD_YELLOW) return 'yellow';
  return 'red';
}

// GET /api/stock — list products with color thresholds; optional ?search= filter
router.get('/', authenticate, async (req, res) => {
  const { search } = req.query;

  let query = supabase
    .from('products')
    .select('id, code, sku, name, price, cost_price, stock, commission_default, faulty_stock, category_id, categories(id, name)')
    .eq('company_id', req.user.company_id)
    .order('name');

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (req.query.branch_id) {
    query = query.eq('branch_id', req.query.branch_id);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (req.query.category_id) {
    query = query.eq('category_id', req.query.category_id);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  const result = data.map((p) => ({ ...p, stock_level: stockLevel(p.stock) }));
  res.json(result);
});

// ── POST /api/stock/transfers — create a transfer request ────
router.post('/transfers', authenticate, async (req, res) => {
  if (!['encargado', 'dueno'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { product_id, to_branch_id, qty, notes, from_branch_id } = req.body;

  if (!product_id || !to_branch_id || !qty || parseInt(qty) <= 0) {
    return res.status(400).json({ error: 'product_id, to_branch_id y qty son requeridos' });
  }

  // dueño can specify from_branch_id explicitly; encargado always uses their own branch
  const fromBranchId = req.user.role === 'dueno'
    ? (from_branch_id || req.user.branch_id)
    : req.user.branch_id;

  if (!fromBranchId) {
    return res.status(400).json({
      error: 'Sucursal de origen requerida',
      hint: 'El dueño debe seleccionar la sucursal de origen al solicitar una transferencia',
    });
  }
  if (fromBranchId === to_branch_id) {
    return res.status(400).json({ error: 'La sucursal destino debe ser distinta a la de origen' });
  }

  // Verify product belongs to the origin branch
  const { data: product } = await supabase
    .from('products')
    .select('id, name, stock, code')
    .eq('id', product_id)
    .eq('branch_id', fromBranchId)
    .eq('company_id', req.user.company_id)
    .single();

  if (!product) return res.status(404).json({ error: 'Producto no encontrado en la sucursal de origen' });
  if (product.stock < parseInt(qty)) {
    return res.status(400).json({ error: `Stock insuficiente. Disponible: ${product.stock}` });
  }

  // Verify destination branch exists and belongs to same company
  const { data: toBranch } = await supabase
    .from('branches')
    .select('id, name')
    .eq('id', to_branch_id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!toBranch) return res.status(404).json({ error: 'Sucursal destino no encontrada' });

  const { data, error } = await supabase
    .from('stock_transfers')
    .insert([{
      company_id:     req.user.company_id,
      from_branch_id: fromBranchId,
      to_branch_id,
      product_id,
      qty:            parseInt(qty),
      notes:          (notes || '').trim(),
      requested_by:   req.user.id,
      status:         'pending',
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── GET /api/stock/transfers — list transfers ────────────────
router.get('/transfers', authenticate, async (req, res) => {
  if (!['encargado', 'dueno'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { status } = req.query;

  let query = supabase
    .from('stock_transfers')
    .select(`
      *,
      products(id, name, code),
      from_branch:branches!from_branch_id(id, name),
      to_branch:branches!to_branch_id(id, name),
      requester:users!requested_by(name),
      resolver:users!resolved_by(name)
    `)
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  // encargado sees only transfers involving their branch
  if (req.user.role !== 'dueno') {
    query = query.or(`from_branch_id.eq.${req.user.branch_id},to_branch_id.eq.${req.user.branch_id}`);
  }

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data ?? []).map((t) => ({
    ...t,
    product_name:       t.products?.name        ?? null,
    product_code:       t.products?.code        ?? null,
    from_branch_name:   t.from_branch?.name     ?? null,
    to_branch_name:     t.to_branch?.name       ?? null,
    requested_by_name:  t.requester?.name       ?? null,
    resolved_by_name:   t.resolver?.name        ?? null,
  })));
});

// ── POST /api/stock/transfers/:id/approve — approve and move stock
router.post('/transfers/:id/approve', authenticate, async (req, res) => {
  if (!['encargado', 'dueno'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { data: transfer } = await supabase
    .from('stock_transfers')
    .select('*')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!transfer) return res.status(404).json({ error: 'Transferencia no encontrada' });
  if (transfer.status !== 'pending') {
    return res.status(400).json({ error: `La transferencia ya fue ${transfer.status}` });
  }

  // 1. Fetch source product to validate available stock
  const { data: srcProduct } = await supabase
    .from('products')
    .select('id, name, code, stock, price, cost_price, category_id, commission_default')
    .eq('id', transfer.product_id)
    .single();

  if (!srcProduct) return res.status(404).json({ error: 'Producto de origen no encontrado' });
  if (srcProduct.stock < transfer.qty) {
    return res.status(400).json({ error: `Stock insuficiente. Disponible: ${srcProduct.stock}` });
  }

  // 2. Find matching product in destination branch (same code)
  let destProduct = null;
  if (srcProduct.code) {
    const { data: found } = await supabase
      .from('products')
      .select('id, stock')
      .eq('code', srcProduct.code)
      .eq('branch_id', transfer.to_branch_id)
      .eq('company_id', req.user.company_id)
      .maybeSingle();
    destProduct = found;
  }

  // 3. Deduct from source
  await supabase
    .from('products')
    .update({ stock: srcProduct.stock - transfer.qty })
    .eq('id', transfer.product_id);

  // 4. Add to destination (or create the product there)
  if (destProduct) {
    await supabase
      .from('products')
      .update({ stock: destProduct.stock + transfer.qty })
      .eq('id', destProduct.id);
  } else {
    // Clone the product into the destination branch
    await supabase
      .from('products')
      .insert([{
        company_id:          req.user.company_id,
        branch_id:           transfer.to_branch_id,
        name:                srcProduct.name,
        code:                srcProduct.code,
        price:               srcProduct.price,
        cost_price:          srcProduct.cost_price,
        stock:               transfer.qty,
        faulty_stock:        0,
        category_id:         srcProduct.category_id,
        commission_default:  srcProduct.commission_default,
      }]);
  }

  // 5. Mark transfer as approved
  const { data: updated, error } = await supabase
    .from('stock_transfers')
    .update({
      status:      'approved',
      resolved_by: req.user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(updated);
});

// ── POST /api/stock/transfers/:id/reject — reject transfer ───
router.post('/transfers/:id/reject', authenticate, async (req, res) => {
  if (!['encargado', 'dueno'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { data: transfer } = await supabase
    .from('stock_transfers')
    .select('id, status, company_id')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!transfer) return res.status(404).json({ error: 'Transferencia no encontrada' });
  if (transfer.status !== 'pending') {
    return res.status(400).json({ error: `La transferencia ya fue ${transfer.status}` });
  }

  const { data, error } = await supabase
    .from('stock_transfers')
    .update({
      status:      'rejected',
      resolved_by: req.user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/stock/:id — adjust stock, or move units between stock and faulty_stock
// Body options:
//   { stock: N }            — set available stock directly
//   { add_faulty: N }       — move N units from stock → faulty_stock
//   { remove_faulty: N }    — move N units from faulty_stock → stock
router.patch('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { stock, add_faulty, remove_faulty } = req.body;

  // Moving units between stock and faulty_stock requires a read-then-write
  if (add_faulty != null || remove_faulty != null) {
    const { data: current, error: fetchErr } = await supabase
      .from('products')
      .select('stock, faulty_stock')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .single();

    if (fetchErr || !current) return res.status(404).json({ error: 'Product not found' });

    let newStock = current.stock;
    let newFaulty = current.faulty_stock ?? 0;

    if (add_faulty != null) {
      const qty = parseInt(add_faulty);
      if (qty <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
      if (qty > newStock) return res.status(400).json({ error: 'No hay suficiente stock disponible' });
      newStock -= qty;
      newFaulty += qty;
    }

    if (remove_faulty != null) {
      const qty = parseInt(remove_faulty);
      if (qty <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
      if (qty > newFaulty) return res.status(400).json({ error: 'No hay suficiente stock con fallas' });
      newFaulty -= qty;
      newStock += qty;
    }

    const { data, error } = await supabase
      .from('products')
      .update({ stock: newStock, faulty_stock: newFaulty })
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .select('id, code, name, stock, faulty_stock')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ...data, stock_level: stockLevel(data.stock) });
  }

  // Direct stock update
  if (stock != null) {
    if (stock < 0) return res.status(400).json({ error: 'Valid stock quantity required' });

    const { data, error } = await supabase
      .from('products')
      .update({ stock })
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .select('id, code, name, stock, faulty_stock')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ...data, stock_level: stockLevel(data.stock) });
  }

  return res.status(400).json({ error: 'No valid fields to update' });
});

module.exports = router;
