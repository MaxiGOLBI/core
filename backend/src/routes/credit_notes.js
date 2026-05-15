'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();
const CASHIER_ROLES = ['cajero', 'encargado', 'dueno'];
const MANAGER = requireRole('encargado', 'dueno');

// ── GET /api/credit-notes — list with filters ─────────────────
router.get('/', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { type, status, client_id, from, to } = req.query;

  let query = supabase
    .from('credit_notes')
    .select('*, clients(name), sales(date, total)')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (req.query.branch_id) {
    query = query.eq('branch_id', req.query.branch_id);
  }

  if (type)      query = query.eq('type', type);
  if (status)    query = query.eq('status', status);
  if (client_id) query = query.eq('client_id', client_id);
  if (from)      query = query.gte('created_at', from);
  if (to)        query = query.lte('created_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data ?? []).map((cn) => ({
    ...cn,
    client_name: cn.clients?.name ?? null,
    sale_date:   cn.sales?.date   ?? null,
    sale_total:  cn.sales?.total  ?? null,
  })));
});

// ── GET /api/credit-notes/:id ────────────────────────────────
router.get('/:id', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { data, error } = await supabase
    .from('credit_notes')
    .select('*, clients(id, name), sales(id, date, total, details_json)')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Nota no encontrada' });
  res.json(data);
});

// ── POST /api/credit-notes — create manually ─────────────────
// Used for debit notes or credit notes not linked to a sale cancellation
router.post('/', authenticate, MANAGER, async (req, res) => {
  const { client_id, sale_id, type, amount, reason, notes, number } = req.body;

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'amount es requerido y debe ser mayor a 0' });
  }
  if (!['credito', 'debito'].includes(type)) {
    return res.status(400).json({ error: 'type debe ser credito o debito' });
  }

  const { data, error } = await supabase
    .from('credit_notes')
    .insert([{
      company_id: req.user.company_id,
      branch_id:  req.user.branch_id,
      client_id:  client_id  || null,
      sale_id:    sale_id    || null,
      type:       type,
      amount:     parseFloat(amount),
      reason:     (reason || '').trim(),
      notes:      (notes  || '').trim(),
      number:     (number || '').trim() || null,
      status:     'pending',
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── PATCH /api/credit-notes/:id — update status or fields ────
router.patch('/:id', authenticate, MANAGER, async (req, res) => {
  const { status, reason, notes, number } = req.body;

  const { data: cn } = await supabase
    .from('credit_notes')
    .select('id, status, company_id')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!cn) return res.status(404).json({ error: 'Nota no encontrada' });

  const updates = {};
  if (status && ['pending', 'used'].includes(status)) updates.status = status;
  if (reason  !== undefined) updates.reason = reason.trim();
  if (notes   !== undefined) updates.notes  = notes.trim();
  if (number  !== undefined) updates.number = number?.trim() || null;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  const { data, error } = await supabase
    .from('credit_notes')
    .update(updates)
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select('*, clients(name)')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Nota no encontrada' });
  res.json(data);
});

// ── DELETE /api/credit-notes/:id — only pending notes ────────
router.delete('/:id', authenticate, MANAGER, async (req, res) => {
  const { data: cn } = await supabase
    .from('credit_notes')
    .select('id, status')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!cn) return res.status(404).json({ error: 'Nota no encontrada' });
  if (cn.status === 'used') {
    return res.status(400).json({ error: 'No se puede eliminar una nota ya utilizada' });
  }

  const { error } = await supabase
    .from('credit_notes')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Nota eliminada' });
});

module.exports = router;
