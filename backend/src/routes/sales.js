const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { generateTicketPDF } = require('../services/ticket');

const CASHIER_ROLES = ['cajero', 'encargado', 'dueno'];

// POST /api/sales/ticket-pdf — generate a comprobante de compra PDF and return it as a blob
// Body: { tableNumber, sellerName, cashierName, items, total, date }
router.post('/ticket-pdf', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  try {
    const { tableNumber, items, total } = req.body;

    if (!tableNumber || !Array.isArray(items) || total === undefined) {
      return res.status(400).json({ error: 'tableNumber, items and total are required' });
    }

    const now = new Date().toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const pdfBuffer = await generateTicketPDF({
      tableNumber,
      sellerName:  req.body.sellerName  || '—',
      cashierName: req.body.cashierName || req.user.email,
      items,
      total,
      date: req.body.date || now,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="comprobante-${tableNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('[ticket-pdf] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sales — history with optional filters
router.get('/', authenticate, async (req, res) => {
  const { from, to, seller_id, product_id, client_id, payment_method } = req.query;

  let query = supabase
    .from('sales')
    .select('*, users!seller_id(name), creator:users!created_by(name), clients(name)')
    .eq('company_id', req.user.company_id)
    .order('date', { ascending: false })
    .limit(500);

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (req.query.branch_id) {
    query = query.eq('branch_id', req.query.branch_id);
  }

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  if (seller_id) query = query.eq('seller_id', seller_id);
  if (client_id) query = query.eq('client_id', client_id);
  if (payment_method) query = query.eq('payment_method', payment_method);

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
    .select('id, date, total, seller_id, cashier_id, client_id, details_json, users!seller_id(name), creator:users!created_by(name), clients(name)')
    .eq('company_id', req.user.company_id)
    .order('date', { ascending: false });

  if (req.query.branch_id) {
    query = query.eq('branch_id', req.query.branch_id);
  }

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

// PATCH /api/sales/:id — update editable fields (payment, client, comment, products)
router.patch('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;
  const { payment_method, payment_breakdown, client_id, comment, details_json, total } = req.body;

  const { data: sale } = await supabase
    .from('sales')
    .select('id, company_id, status, details_json')
    .eq('id', id)
    .single();

  if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
  if (sale.company_id && sale.company_id !== req.user.company_id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (sale.status === 'cancelled') return res.status(400).json({ error: 'No se puede editar una venta cancelada' });

  const updates = {};
  if (payment_method !== undefined) updates.payment_method = payment_method;
  if (payment_breakdown !== undefined) updates.payment_breakdown = payment_breakdown;
  if (client_id !== undefined) updates.client_id = client_id || null;
  if (comment !== undefined) updates.comment = comment;

  // Handle product list changes with stock adjustments
  if (details_json !== undefined) {
    const oldItems = sale.details_json ?? [];
    const newItems = details_json ?? [];

    // Build product_id -> total qty maps
    const oldMap = {};
    oldItems.forEach((item) => {
      if (item.product_id) oldMap[item.product_id] = (oldMap[item.product_id] || 0) + (item.qty || 0);
    });
    const newMap = {};
    newItems.forEach((item) => {
      if (item.product_id) newMap[item.product_id] = (newMap[item.product_id] || 0) + (item.qty || 0);
    });

    // Compute delta for each product (positive = restore, negative = deduct)
    const allIds = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
    for (const productId of allIds) {
      const delta = (oldMap[productId] || 0) - (newMap[productId] || 0);
      if (delta === 0) continue;
      const { data: prod } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
      if (prod) {
        await supabase
          .from('products')
          .update({ stock: Math.max(0, prod.stock + delta) })
          .eq('id', productId);
      }
    }

    updates.details_json = newItems;
    if (total !== undefined) updates.total = total;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  const { data, error } = await supabase
    .from('sales')
    .update(updates)
    .eq('id', id)
    .select('*, users!seller_id(name), clients(name)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/sales/:id/cancel — cancel a completed sale
// Restores stock for all items, keeps seller commission, creates a credit note if client exists.
router.post('/:id/cancel', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;
  const { mark_faulty } = req.body;

  // Fetch the sale — don't filter by company_id here since old sales may have it null
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, status, total, client_id, details_json, company_id, branch_id')
    .eq('id', id)
    .single();

  if (saleErr || !sale) return res.status(404).json({ error: 'Venta no encontrada' });

  // Security: verify sale belongs to user's company (allow null company_id for legacy rows)
  if (sale.company_id && sale.company_id !== req.user.company_id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (sale.status === 'cancelled') return res.status(400).json({ error: 'La venta ya está cancelada' });

  // Restore stock (and optionally increment faulty_stock) for each product
  const items = sale.details_json ?? [];
  for (const item of items) {
    if (!item.product_id || !item.qty) continue;
    const { data: prod } = await supabase
      .from('products')
      .select('stock, faulty_stock')
      .eq('id', item.product_id)
      .eq('company_id', req.user.company_id)
      .single();
    if (prod) {
      const update = { stock: prod.stock + item.qty };
      if (mark_faulty) {
        update.faulty_stock = (prod.faulty_stock ?? 0) + item.qty;
      }
      await supabase
        .from('products')
        .update(update)
        .eq('id', item.product_id);
    }
  }

  // Mark sale as cancelled (commission intentionally kept)
  await supabase
    .from('sales')
    .update({ status: 'cancelled' })
    .eq('id', id);

  // Create credit note if the sale had a client
  let creditNote = null;
  if (sale.client_id) {
    const { data: cn } = await supabase
      .from('credit_notes')
      .insert([{
        sale_id:    id,
        client_id:  sale.client_id,
        amount:     sale.total,
        reason:     'Cancelación de venta',
        status:     'pending',
        company_id: sale.company_id,
        branch_id:  sale.branch_id,
      }])
      .select()
      .single();
    creditNote = cn;
  }

  res.json({ message: 'Venta cancelada, stock restaurado', credit_note: creditNote });
});

// POST /api/sales/:id/credit-note — create a credit note after cancellation (no client was set at sale time)
router.post('/:id/credit-note', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { client_id } = req.body;
  if (!client_id) return res.status(400).json({ error: 'Se requiere un cliente' });

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, status, total, company_id, branch_id')
    .eq('id', req.params.id)
    .single();

  if (saleErr || !sale) return res.status(404).json({ error: 'Venta no encontrada' });
  if (sale.company_id && sale.company_id !== req.user.company_id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (sale.status !== 'cancelled') {
    return res.status(400).json({ error: 'La venta debe estar cancelada para generar una nota de crédito' });
  }

  // Verify no credit note exists yet for this sale
  const { data: existing } = await supabase
    .from('credit_notes')
    .select('id')
    .eq('sale_id', req.params.id)
    .maybeSingle();
  if (existing) return res.status(400).json({ error: 'Ya existe una nota de crédito para esta venta' });

  const { data: cn, error } = await supabase
    .from('credit_notes')
    .insert([{
      sale_id:    req.params.id,
      client_id,
      amount:     sale.total,
      reason:     'Cancelación de venta',
      status:     'pending',
      company_id: sale.company_id,
      branch_id:  sale.branch_id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(cn);
});

// GET /api/sales/credit-notes — list credit notes
router.get('/credit-notes', authenticate, requireRole('cajero', 'encargado', 'dueno'), async (req, res) => {
  let query = supabase
    .from('credit_notes')
    .select('*, clients(name), sales(date, total)')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
