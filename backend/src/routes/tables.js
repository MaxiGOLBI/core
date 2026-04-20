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
    .select('*, table_items(*, products(name, price)), seller:users!seller_id(name)')
    .order('created_at');

  // Sellers only see their own tables
  if (req.user.role === 'vendedor') {
    query = query.eq('seller_id', req.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/tables — create new table (seller)
router.post('/', authenticate, requireRole('vendedor', 'encargado', 'dueno'), async (req, res) => {
  const { table_number, client_id, comment } = req.body;

  if (!table_number) {
    return res.status(400).json({ error: 'table_number is required' });
  }

  const { data, error } = await supabase
    .from('tables_queue')
    .insert([{
      table_number,
      seller_id: req.user.id,
      status: 'open',
      client_id: client_id || null,
      comment: comment || '',
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /api/tables/:id
router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('tables_queue')
    .select('*, table_items(*, products(id, name, price, code)), seller:users!seller_id(name)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/tables/:id — update table (add items, client, etc.)
router.put('/:id', authenticate, requireRole('vendedor', 'encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;
  const { table_number, items, client_id, seller_id, comment } = req.body;

  // Verify seller owns the table or is manager/owner
  if (req.user.role === 'vendedor') {
    const { data: tbl } = await supabase
      .from('tables_queue')
      .select('seller_id, status, locked_by, locked_at')
      .eq('id', id)
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
    .select('*, table_items(*, products(name, price)), seller:users!seller_id(name)')
    .eq('id', id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/tables/:id/confirm — seller confirms table, sends to cashier queue
router.post('/:id/confirm', authenticate, requireRole('vendedor', 'encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;

  const { data: tbl } = await supabase
    .from('tables_queue')
    .select('seller_id, status')
    .eq('id', id)
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

// POST /api/tables/:id/complete — cashier completes sale
router.post('/:id/complete', authenticate, requireRole('cajero', 'encargado', 'dueno'), async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase.rpc('complete_sale', {
    p_table_id: id,
    p_cashier_id: req.user.id,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Sale completed', data });
});

// POST /api/tables/:id/lock — adquiere el candado del ticket
router.post('/:id/lock', authenticate, async (req, res) => {
  const { id } = req.params;

  const { data: tbl } = await supabase
    .from('tables_queue')
    .select('locked_by, locked_at, status')
    .eq('id', id)
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
