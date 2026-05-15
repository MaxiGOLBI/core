'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();
const OWNER = requireRole('dueno');

// ── POST /api/export-logs — record a CSV export ───────────────
// Called internally by other routes after generating a CSV
router.post('/', authenticate, async (req, res) => {
  const { type, filters, row_count } = req.body;

  if (!type) return res.status(400).json({ error: 'type es requerido' });

  const { data, error } = await supabase
    .from('export_logs')
    .insert([{
      company_id: req.user.company_id,
      user_id:    req.user.id,
      type:       type.trim(),
      filters:    filters || {},
      row_count:  row_count || 0,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── GET /api/export-logs — list export history ────────────────
router.get('/', authenticate, OWNER, async (req, res) => {
  const { from, to, type } = req.query;

  let query = supabase
    .from('export_logs')
    .select('*, users!user_id(name, email)')
    .eq('company_id', req.user.company_id)
    .order('exported_at', { ascending: false });

  if (type) query = query.eq('type', type);
  if (from) query = query.gte('exported_at', from);
  if (to)   query = query.lte('exported_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data ?? []).map((l) => ({
    ...l,
    user_name:  l.users?.name  ?? null,
    user_email: l.users?.email ?? null,
  })));
});

module.exports = router;
