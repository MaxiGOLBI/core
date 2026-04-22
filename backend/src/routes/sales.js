const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/sales — history with optional filters
router.get('/', authenticate, async (req, res) => {
  const { from, to, seller_id, product_id, client_id } = req.query;

  let query = supabase
    .from('sales')
    .select('*, users!seller_id(name), clients(name)')
    .order('date', { ascending: false });

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  if (seller_id) query = query.eq('seller_id', seller_id);
  if (client_id) query = query.eq('client_id', client_id);

  if (req.user.role === 'vendedor') {
    query = query.eq('seller_id', req.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Collect all unique product_ids from details_json to enrich product names
  const productIds = new Set();
  data.forEach((sale) => {
    (sale.details_json ?? []).forEach((item) => {
      if (item.product_id) productIds.add(item.product_id);
    });
  });

  let productMap = {};
  if (productIds.size > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, code')
      .in('id', [...productIds]);
    if (products) {
      products.forEach((p) => { productMap[p.id] = p; });
    }
  }

  // Inject product_name into each details_json item
  const enriched = data.map((sale) => ({
    ...sale,
    details_json: (sale.details_json ?? []).map((item) => ({
      ...item,
      product_name: item.product_name ?? productMap[item.product_id]?.name ?? null,
    })),
  }));

  // Optional product filter
  if (product_id) {
    return res.json(enriched.filter((sale) =>
      sale.details_json.some((d) => d.product_id === product_id)
    ));
  }

  res.json(enriched);
});

// GET /api/sales/export — export CSV (encargado/dueno only)
router.get('/export', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { from, to } = req.query;

  let query = supabase
    .from('sales')
    .select('id, date, total, seller_id, cashier_id, client_id, details_json, users!seller_id(name), clients(name)')
    .order('date', { ascending: false });

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Enrich product names
  const productIds = new Set();
  data.forEach((s) => (s.details_json ?? []).forEach((i) => { if (i.product_id) productIds.add(i.product_id); }));
  let productMap = {};
  if (productIds.size > 0) {
    const { data: products } = await supabase.from('products').select('id, name').in('id', [...productIds]);
    if (products) products.forEach((p) => { productMap[p.id] = p.name; });
  }

  const headers = ['id', 'fecha', 'vendedor', 'cliente', 'productos', 'total'];
  const rows = data.map((s) => {
    const productos = (s.details_json ?? [])
      .map((i) => `${i.product_name ?? productMap[i.product_id] ?? i.product_id} x${i.qty}`)
      .join(' | ');
    return [
      s.id,
      s.date,
      s.users?.name ?? s.seller_id,
      s.clients?.name ?? '',
      productos,
      s.total,
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ventas.csv"');
  return res.send('\uFEFF' + csv); // BOM for Excel UTF-8
});

// PATCH /api/sales/:id/cae — persist CAE data after AFIP approval [IV, REH]
router.patch('/:id/cae', authenticate, requireRole('cajero', 'encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;
  const { cae, cae_vto } = req.body;

  if (!cae || !cae_vto) {
    return res.status(400).json({ error: 'cae and cae_vto are required' });
  }

  const { error } = await supabase
    .from('sales')
    .update({ cae, cae_vto })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'CAE saved' });
});

module.exports = router;
