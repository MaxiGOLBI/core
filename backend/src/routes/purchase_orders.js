'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();
const MANAGER = requireRole('encargado', 'dueno');

// ── Helpers ────────────────────────────────────────────────────

function calcTotal(items) {
  return (items ?? []).reduce((sum, i) => sum + (parseFloat(i.unit_cost || 0) * parseInt(i.qty || 0)), 0);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ── GET /api/purchase-orders — list with filters ──────────────
router.get('/', authenticate, MANAGER, async (req, res) => {
  const { status, supplier_id, branch_id, from, to } = req.query;

  let query = supabase
    .from('purchase_orders')
    .select('*, suppliers(id, name), branches(id, name), creator:users!created_by(name)')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  if (status)      query = query.eq('status', status);
  if (supplier_id) query = query.eq('supplier_id', supplier_id);
  if (from)        query = query.gte('created_at', from);
  if (to)          query = query.lte('created_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data ?? []).map((o) => ({
    ...o,
    supplier_name: o.suppliers?.name  ?? null,
    branch_name:   o.branches?.name   ?? null,
    created_by_name: o.creator?.name  ?? null,
  })));
});

// ── GET /api/purchase-orders/:id — single order ───────────────
router.get('/:id', authenticate, MANAGER, async (req, res) => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(id, name, cuit, phone), branches(id, name), creator:users!created_by(name), receiver:users!received_by(name)')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Pedido no encontrado' });

  res.json({
    ...data,
    supplier_name:    data.suppliers?.name  ?? null,
    branch_name:      data.branches?.name   ?? null,
    created_by_name:  data.creator?.name    ?? null,
    received_by_name: data.receiver?.name   ?? null,
  });
});

// ── POST /api/purchase-orders — create order ─────────────────
router.post('/', authenticate, MANAGER, async (req, res) => {
  const { supplier_id, order_type, items, notes, expected_date, branch_id } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items es requerido y no puede estar vacío' });
  }

  // Validate each item has qty and product info
  for (const item of items) {
    if (!item.qty || parseInt(item.qty) <= 0) {
      return res.status(400).json({ error: 'Cada ítem debe tener qty > 0' });
    }
    if (!item.product_name && !item.product_id) {
      return res.status(400).json({ error: 'Cada ítem debe tener product_name o product_id' });
    }
  }

  const targetBranchId = req.user.role === 'dueno' ? (branch_id || req.user.branch_id) : req.user.branch_id;
  if (!targetBranchId) {
    return res.status(400).json({
      error: 'branch_id es requerido',
      hint: req.user.role === 'dueno'
        ? 'El dueño debe seleccionar una sucursal destino al crear el pedido'
        : 'Usuario sin sucursal asignada — contactá al administrador',
    });
  }

  const total = round2(calcTotal(items));

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([{
      company_id:    req.user.company_id,
      branch_id:     targetBranchId,
      supplier_id:   supplier_id || null,
      order_type:    order_type || 'proveedor',
      items,
      total,
      notes:         (notes || '').trim(),
      expected_date: expected_date || null,
      status:        'draft',
      created_by:    req.user.id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── PUT /api/purchase-orders/:id — update draft order ────────
router.put('/:id', authenticate, MANAGER, async (req, res) => {
  const { supplier_id, order_type, items, notes, expected_date, status } = req.body;

  const { data: order } = await supabase
    .from('purchase_orders')
    .select('id, status, company_id')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (order.status === 'received') return res.status(400).json({ error: 'No se puede editar un pedido ya recibido' });
  if (order.status === 'cancelled') return res.status(400).json({ error: 'No se puede editar un pedido cancelado' });

  const updates = {
    notes: (notes || '').trim(),
    expected_date: expected_date || null,
  };

  if (supplier_id !== undefined) updates.supplier_id = supplier_id || null;
  if (order_type)  updates.order_type = order_type;
  if (status && ['draft', 'sent'].includes(status)) updates.status = status;

  if (Array.isArray(items) && items.length > 0) {
    updates.items = items;
    updates.total = round2(calcTotal(items));
  }

  const { data, error } = await supabase
    .from('purchase_orders')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST /api/purchase-orders/:id/receive — receive merchandise
// Increases stock for each item + creates supplier debt if supplier_id set
router.post('/:id/receive', authenticate, MANAGER, async (req, res) => {
  const { data: order, error: orderErr } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (orderErr || !order) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (order.status === 'received')  return res.status(400).json({ error: 'El pedido ya fue recibido' });
  if (order.status === 'cancelled') return res.status(400).json({ error: 'El pedido está cancelado' });

  const items = order.items ?? [];
  const stockErrors = [];

  // Update stock for each item
  for (const item of items) {
    const qty = parseInt(item.qty || 0);
    if (!qty) continue;

    if (item.product_id) {
      // Update by product_id directly
      const { data: prod } = await supabase
        .from('products')
        .select('id, stock')
        .eq('id', item.product_id)
        .eq('branch_id', order.branch_id)
        .eq('company_id', req.user.company_id)
        .maybeSingle();

      if (prod) {
        await supabase
          .from('products')
          .update({ stock: prod.stock + qty })
          .eq('id', prod.id);
      } else {
        stockErrors.push(`Producto ${item.product_name || item.product_id} no encontrado en la sucursal`);
      }
    } else if (item.code) {
      // Lookup by code in the branch
      const { data: prod } = await supabase
        .from('products')
        .select('id, stock')
        .eq('code', item.code)
        .eq('branch_id', order.branch_id)
        .eq('company_id', req.user.company_id)
        .maybeSingle();

      if (prod) {
        await supabase
          .from('products')
          .update({ stock: prod.stock + qty })
          .eq('id', prod.id);
      } else {
        stockErrors.push(`Producto con código ${item.code} no encontrado en la sucursal`);
      }
    }
  }

  // Create supplier debt if order has a supplier
  if (order.supplier_id && order.total > 0) {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, balance')
      .eq('id', order.supplier_id)
      .single();

    if (supplier) {
      const newBalance = round2(parseFloat(supplier.balance) + parseFloat(order.total));

      await supabase
        .from('supplier_transactions')
        .insert([{
          company_id:  req.user.company_id,
          supplier_id: order.supplier_id,
          type:        'deuda',
          amount:      order.total,
          date:        new Date().toISOString().split('T')[0],
          reference:   `Pedido #${order.id.slice(0, 8).toUpperCase()}`,
          notes:       'Generado automáticamente al recepcionar pedido',
          created_by:  req.user.id,
        }]);

      await supabase
        .from('suppliers')
        .update({ balance: newBalance })
        .eq('id', order.supplier_id);
    }
  }

  // Mark as received
  const { data: updated, error } = await supabase
    .from('purchase_orders')
    .update({
      status:      'received',
      received_by: req.user.id,
      received_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ order: updated, stock_warnings: stockErrors });
});

// ── POST /api/purchase-orders/:id/cancel ─────────────────────
router.post('/:id/cancel', authenticate, MANAGER, async (req, res) => {
  const { data: order } = await supabase
    .from('purchase_orders')
    .select('id, status, company_id')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (order.status === 'received')  return res.status(400).json({ error: 'No se puede cancelar un pedido ya recibido' });
  if (order.status === 'cancelled') return res.status(400).json({ error: 'El pedido ya está cancelado' });

  const { data, error } = await supabase
    .from('purchase_orders')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
