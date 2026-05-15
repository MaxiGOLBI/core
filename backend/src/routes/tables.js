const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Returns true if the ticket is actively locked by someone OTHER than byUserId
function isLockedByOther(tbl, byUserId) {
  if (!tbl.locked_by || !tbl.locked_at) return false;
  const expired = Date.now() - new Date(tbl.locked_at).getTime() > LOCK_TTL_MS;
  if (expired) return false;
  return tbl.locked_by !== byUserId;
}

// GET /api/tables — list all active tables for current seller or all if cashier/manager
router.get('/', authenticate, async (req, res) => {
  let query = supabase
    .from('tables_queue')
    .select('*, service_data, table_items(*, products(name, price)), seller:users!seller_id(name), client:clients!client_id(name)')
    .eq('company_id', req.user.company_id)
    .order('created_at');

  // Non-dueño: only see their branch's tables
  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (req.query.branch_id) {
    query = query.eq('branch_id', req.query.branch_id);
  }

  // Sellers only see their own tables
  if (req.user.role === 'vendedor') {
    query = query.eq('seller_id', req.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/tables — create new table (seller)
router.post('/', authenticate, requireRole('vendedor', 'cajero', 'encargado', 'dueno'), async (req, res) => {
  const { table_number, items, client_id, seller_id, comment, discount_value, discount_type, discount_id, discount_name, service_data } = req.body;

  if (!table_number) {
    return res.status(400).json({ error: 'table_number is required' });
  }

  const { data, error } = await supabase
    .from('tables_queue')
    .insert([{
      table_number,
      seller_id: seller_id || req.user.id,
      created_by: req.user.id,
      status: 'open',
      client_id:      client_id     || null,
      comment:        comment       || '',
      discount_value: discount_value ?? 0,
      discount_type:  discount_type  ?? 'fixed',
      discount_id:    discount_id    ?? null,
      discount_name:  discount_name  ?? null,
      service_data:   service_data   ?? null,
      company_id:     req.user.company_id,
      branch_id:      req.user.branch_id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Insert items if provided
  if (data && items && Array.isArray(items) && items.length > 0) {
    const rows = items
      .filter(item => item.product_id)
      .map(item => ({
        table_id:       data.id,
        product_id:     item.product_id,
        qty:            item.qty,
        unit_price:     item.unit_price,
        discount_value: item.discount_value ?? 0,
        discount_type:  item.discount_type  ?? 'fixed',
        comment:        item.comment        ?? '',
      }));
    if (rows.length > 0) {
      await supabase.from('table_items').insert(rows);
    }
  }

  // Return ticket with items
  const { data: full } = await supabase
    .from('tables_queue')
    .select('*, service_data, table_items(*, products(name, price)), seller:users!seller_id(name), creator:users!created_by(name), client:clients!client_id(name)')
    .eq('id', data.id)
    .single();

  res.status(201).json(full ?? data);
});

// GET /api/tables/:id
router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('tables_queue')
    .select('*, table_items(*, products(id, name, price, code)), seller:users!seller_id(name), client:clients!client_id(name)')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/tables/:id — update table (add items, client, etc.)
router.put('/:id', authenticate, requireRole('vendedor', 'cajero', 'encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;
  const { table_number, items, client_id, seller_id, comment, discount_value, discount_type, discount_id, discount_name, service_data } = req.body;

  // Verify seller owns the table or is manager/owner
  if (req.user.role === 'vendedor') {
    const { data: tbl } = await supabase
      .from('tables_queue')
      .select('seller_id, status, locked_by, locked_at')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .single();

    if (!tbl || tbl.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this table' });
    }
    if (tbl.status !== 'open') {
      return res.status(400).json({ error: 'Cannot edit a confirmed or completed table' });
    }
    if (isLockedByOther(tbl, req.user.id)) {
      return res.status(423).json({ error: 'Este ticket está siendo editado por otro vendedor.' });
    }
  } else {
    // encargado/dueno: solo verificar lock
    const { data: tbl } = await supabase
      .from('tables_queue')
      .select('locked_by, locked_at')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .single();

    if (tbl && isLockedByOther(tbl, req.user.id)) {
      return res.status(423).json({ error: 'Este ticket está siendo editado por otro vendedor.' });
    }
  }

  // Build update object with only provided fields
  const updateFields = {};
  if (table_number) updateFields.table_number = table_number;
  if (client_id !== undefined) updateFields.client_id = client_id || null;
  if (comment !== undefined) updateFields.comment = comment;
  if (seller_id && req.user.role !== 'vendedor') updateFields.seller_id = seller_id;
  if (discount_value !== undefined) updateFields.discount_value = discount_value ?? 0;
  if (discount_type  !== undefined) updateFields.discount_type  = discount_type  ?? 'fixed';
  if (discount_id    !== undefined) updateFields.discount_id    = discount_id    ?? null;
  if (discount_name  !== undefined) updateFields.discount_name  = discount_name  ?? null;
  if (service_data   !== undefined) updateFields.service_data   = service_data   ?? null;
  updateFields.updated_at = new Date().toISOString();

  await supabase.from('tables_queue').update(updateFields).eq('id', id);

  // Replace items if provided
  if (items && Array.isArray(items)) {
    await supabase.from('table_items').delete().eq('table_id', id);

    if (items.length > 0) {
      const rows = items.map((item) => ({
        table_id: id,
        product_id: item.product_id,
        qty: item.qty,
        unit_price: item.unit_price,
        discount_value: item.discount_value ?? 0,
        discount_type: item.discount_type ?? 'fixed',
        comment: item.comment ?? '',
      }));
      const { error: insertError } = await supabase.from('table_items').insert(rows);
      if (insertError) return res.status(500).json({ error: insertError.message });
    }
  }

  const { data, error } = await supabase
    .from('tables_queue')
    .select('*, service_data, table_items(*, products(name, price)), seller:users!seller_id(name), client:clients!client_id(name)')
    .eq('id', id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/tables/:id/confirm — seller confirms table, sends to cashier queue
router.post('/:id/confirm', authenticate, requireRole('vendedor', 'cajero', 'encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;

  const { data: tbl } = await supabase
    .from('tables_queue')
    .select('seller_id, status')
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!tbl) return res.status(404).json({ error: 'Table not found' });

  if (req.user.role === 'vendedor' && tbl.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not own this table' });
  }

  if (tbl.status !== 'open') {
    return res.status(400).json({ error: 'Table is not in open state' });
  }

  const { data, error } = await supabase
    .from('tables_queue')
    .update({ status: 'confirmed', locked_by: null, locked_at: null, confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/tables/:id/complete — cashier completes sale, returns sale_id for comprobante flow
// Body: { payment_method: 'efectivo'|'tarjeta'|'virtual'|'multiple', payment_breakdown: { efectivo: N, tarjeta: N, virtual: N } }
router.post('/:id/complete', authenticate, requireRole('cajero', 'encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;
  const { payment_method = 'efectivo', payment_breakdown = null } = req.body;

  // Security: verify table belongs to this company and fetch seller [SFT]
  const { data: tbl, error: tblErr } = await supabase
    .from('tables_queue')
    .select('company_id, seller_id, created_by')
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .single();

  if (tblErr || !tbl) return res.status(404).json({ error: 'Tabla no encontrada' });

  // ── Stock validation: check every item has enough stock before completing ──
  const { data: tableItems } = await supabase
    .from('table_items')
    .select('product_id, qty')
    .eq('table_id', id);

  if (tableItems && tableItems.length > 0) {
    const productIds = tableItems.map((i) => i.product_id).filter(Boolean);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, stock')
      .in('id', productIds);

    const productMap = {};
    products?.forEach((p) => { productMap[p.id] = p; });

    for (const item of tableItems) {
      const product = productMap[item.product_id];
      if (product && product.stock < item.qty) {
        return res.status(400).json({
          error: `Sin stock suficiente para "${product.name}". Disponible: ${product.stock}, requerido: ${item.qty}.`,
        });
      }
    }
  }

  const { data, error } = await supabase.rpc('complete_sale', {
    p_table_id: id,
    p_cashier_id: req.user.id,
  });

  if (error) return res.status(500).json({ error: error.message });

  // Fetch the ID of the sale that was just created [AC]
  const { data: latestSale } = await supabase
    .from('sales')
    .select('id, seller_id, details_json')
    .eq('cashier_id', req.user.id)
    .eq('company_id', req.user.company_id)
    .gte('date', new Date(Date.now() - 15000).toISOString())
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (latestSale?.id) {
    const updateFields = { payment_method, status: 'completed' };
    if (payment_breakdown) updateFields.payment_breakdown = payment_breakdown;
    // Backfill seller_id if the RPC did not set it from the table [CF]
    if (tbl.seller_id && !latestSale.seller_id) updateFields.seller_id = tbl.seller_id;
    // Transfer ticket creator to the sale record
    if (tbl.created_by) updateFields.created_by = tbl.created_by;

    // Snapshot commission_per_unit into details_json so history always reflects
    // the commission rules active at the moment of the sale, not the current ones.
    const detailItems = latestSale.details_json ?? [];
    const productIds = [...new Set(detailItems.map(i => i.product_id).filter(Boolean))];
    if (productIds.length > 0) {
      const [{ data: prods }, { data: commRules }] = await Promise.all([
        supabase.from('products').select('id, commission_default').in('id', productIds),
        supabase.from('commissions').select('product_id, commission_per_unit')
          .in('product_id', productIds).eq('company_id', req.user.company_id).eq('active', true),
      ]);
      const prodMap = {};
      (prods ?? []).forEach(p => { prodMap[p.id] = p; });
      const commMap = {};
      (commRules ?? []).forEach(r => { commMap[r.product_id] = r; });
      updateFields.details_json = detailItems.map(item => {
        if (item.commission_per_unit != null) return item; // already snapshotted
        return {
          ...item,
          commission_per_unit: Number(
            commMap[item.product_id]?.commission_per_unit ??
            prodMap[item.product_id]?.commission_default ??
            0
          ),
        };
      });
    }

    await supabase.from('sales').update(updateFields).eq('id', latestSale.id);
  }

  res.json({ message: 'Sale completed', sale_id: latestSale?.id ?? null, data });
});

// POST /api/tables/:id/lock — adquiere el candado del ticket
router.post('/:id/lock', authenticate, async (req, res) => {
  const { id } = req.params;

  const { data: tbl } = await supabase
    .from('tables_queue')
    .select('locked_by, locked_at, status')
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!tbl) return res.status(404).json({ error: 'Ticket no encontrado' });
  if (tbl.status !== 'open') return res.status(400).json({ error: 'Solo se bloquean tickets abiertos' });

  if (isLockedByOther(tbl, req.user.id)) {
    return res.status(423).json({ error: 'Este ticket está siendo editado por otro vendedor.' });
  }

  const { data, error } = await supabase
    .from('tables_queue')
    .update({ locked_by: req.user.id, locked_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/tables/:id/unlock — libera el candado
router.post('/:id/unlock', authenticate, async (req, res) => {
  const { id } = req.params;

  const { data: tbl } = await supabase
    .from('tables_queue')
    .select('locked_by')
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!tbl) return res.status(404).json({ error: 'Ticket no encontrado' });

  // Solo el dueño del lock o un encargado/dueno puede liberar
  const canUnlock =
    tbl.locked_by === req.user.id || ['encargado', 'dueno'].includes(req.user.role);

  if (!canUnlock) {
    return res.status(403).json({ error: 'No podés desbloquear un ticket que no es tuyo.' });
  }

  await supabase
    .from('tables_queue')
    .update({ locked_by: null, locked_at: null })
    .eq('id', id);

  res.json({ message: 'Ticket desbloqueado' });
});

// POST /api/tables/:id/cancel — cancel table
router.post('/:id/cancel', authenticate, requireRole('cajero', 'encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('tables_queue')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/tables/:id — delete open table (seller/manager)
router.delete('/:id', authenticate, requireRole('vendedor', 'encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;

  const { data: tbl } = await supabase
    .from('tables_queue')
    .select('seller_id, status')
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!tbl) return res.status(404).json({ error: 'Table not found' });

  if (req.user.role === 'vendedor' && tbl.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not own this table' });
  }

  if (tbl.status !== 'open') {
    return res.status(400).json({ error: 'Can only delete open tables' });
  }

  await supabase.from('table_items').delete().eq('table_id', id);
  const { error } = await supabase.from('tables_queue').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Table deleted' });
});

module.exports = router;
