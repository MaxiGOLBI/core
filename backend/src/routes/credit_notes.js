'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();
const CASHIER_ROLES = ['cajero', 'encargado', 'dueno'];

// ── GET /api/credit-notes — list with filters ─────────────────
router.get('/', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { status, from, to } = req.query;

  let query = supabase
    .from('credit_notes')
    .select('*')
    .eq('company_id', req.user.company_id)
    .eq('type', 'credito')
    .order('created_at', { ascending: false });

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (req.query.branch_id) {
    query = query.eq('branch_id', req.query.branch_id);
  }

  if (status) query = query.eq('status', status);
  if (from)   query = query.gte('created_at', from);
  if (to)     query = query.lte('created_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// ── POST /api/credit-notes — create ──────────────────────────
router.post('/', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { client_name, dni, amount, reason, notes } = req.body;

  if (!client_name?.trim()) {
    return res.status(400).json({ error: 'El nombre del cliente es requerido' });
  }
  if (!dni?.trim()) {
    return res.status(400).json({ error: 'El DNI es requerido' });
  }
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  }
  if (!reason?.trim()) {
    return res.status(400).json({ error: 'El motivo es requerido' });
  }

  // Auto-generate sequential number per company
  const { count } = await supabase
    .from('credit_notes')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', req.user.company_id)
    .eq('type', 'credito');

  const number = `NC-${String((count ?? 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('credit_notes')
    .insert([{
      company_id:  req.user.company_id,
      branch_id:   req.user.branch_id,
      client_name: client_name.trim(),
      dni:         dni.trim(),
      type:        'credito',
      amount:      parseFloat(amount),
      reason:      reason.trim(),
      notes:       (notes || '').trim(),
      number,
      status:      'pending',
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── PATCH /api/credit-notes/:id — update status ──────────────
router.patch('/:id', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { status } = req.body;

  const { data: cn } = await supabase
    .from('credit_notes')
    .select('id, status, company_id')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!cn) return res.status(404).json({ error: 'Nota no encontrada' });
  if (!status || !['pending', 'used'].includes(status)) {
    return res.status(400).json({ error: 'status debe ser pending o used' });
  }

  const { data, error } = await supabase
    .from('credit_notes')
    .update({ status })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── DELETE /api/credit-notes/:id — only pending notes ────────
router.delete('/:id', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
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
