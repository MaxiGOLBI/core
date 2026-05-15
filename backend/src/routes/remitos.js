'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { generateRemitoPDF } = require('../services/remito');

const router = Router();
const CASHIER_ROLES = ['cajero', 'encargado', 'dueno'];

// ── GET /api/remitos — list ───────────────────────────────────
router.get('/', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { sale_id, from, to } = req.query;

  let query = supabase
    .from('remitos')
    .select('*, users!created_by(name)')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  if (req.user.role !== 'dueno') query = query.eq('branch_id', req.user.branch_id);
  if (sale_id) query = query.eq('sale_id', sale_id);
  if (from)    query = query.gte('created_at', from);
  if (to)      query = query.lte('created_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data ?? []).map((r) => ({ ...r, created_by_name: r.users?.name ?? null })));
});

// ── POST /api/remitos — create remito ─────────────────────────
router.post('/', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { sale_id, client_name, client_address, items, notes, delivered_at, signed_by, number } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items es requerido' });
  }

  const { data, error } = await supabase
    .from('remitos')
    .insert([{
      company_id:     req.user.company_id,
      branch_id:      req.user.branch_id,
      sale_id:        sale_id        || null,
      number:         (number        || '').trim() || null,
      client_name:    (client_name   || '').trim(),
      client_address: (client_address|| '').trim(),
      items,
      notes:          (notes         || '').trim(),
      delivered_at:   delivered_at   || null,
      signed_by:      (signed_by     || '').trim(),
      created_by:     req.user.id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── PATCH /api/remitos/:id — mark as delivered ────────────────
router.patch('/:id', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { delivered_at, signed_by, notes } = req.body;

  const { data, error } = await supabase
    .from('remitos')
    .update({
      ...(delivered_at !== undefined && { delivered_at: delivered_at || null }),
      ...(signed_by    !== undefined && { signed_by:    (signed_by || '').trim() }),
      ...(notes        !== undefined && { notes:        (notes     || '').trim() }),
    })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Remito no encontrado' });
  res.json(data);
});

// ── GET /api/remitos/:id/pdf — generate and return PDF ────────
router.get('/:id/pdf', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { data: remito, error } = await supabase
    .from('remitos')
    .select('*, users!created_by(name)')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (error || !remito) return res.status(404).json({ error: 'Remito no encontrado' });

  const date = new Date(remito.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  try {
    const pdfBuffer = await generateRemitoPDF({
      number:        remito.number,
      clientName:    remito.client_name,
      clientAddress: remito.client_address,
      items:         remito.items ?? [],
      notes:         remito.notes,
      date,
      createdBy:     remito.users?.name ?? req.user.email,
    });

    const filename = `remito-${remito.number || remito.id.slice(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('[remito-pdf]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/remitos/from-sale/:saleId — create from existing sale
router.post('/from-sale/:saleId', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('*, clients(name)')
    .eq('id', req.params.saleId)
    .eq('company_id', req.user.company_id)
    .single();

  if (saleErr || !sale) return res.status(404).json({ error: 'Venta no encontrada' });

  const items = (sale.details_json ?? []).map((item) => ({
    product_id:   item.product_id,
    name:         item.product_name || item.name || 'Producto',
    qty:          item.qty,
    price:        item.price ?? item.unitPrice ?? 0,
  }));

  const { data, error } = await supabase
    .from('remitos')
    .insert([{
      company_id:  req.user.company_id,
      branch_id:   req.user.branch_id,
      sale_id:     sale.id,
      client_name: sale.clients?.name || req.body.client_name || '',
      items,
      notes:       req.body.notes || '',
      created_by:  req.user.id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
