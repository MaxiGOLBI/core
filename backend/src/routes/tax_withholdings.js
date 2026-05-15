'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();
const MANAGER = requireRole('encargado', 'dueno');

const VALID_TYPES   = ['retencion', 'percepcion'];
const VALID_AGENCIES = ['AFIP', 'IIBB_BUENOS_AIRES', 'IIBB_CABA', 'IIBB_CORDOBA', 'IIBB_SANTA_FE', 'OTRO'];

// ── GET /api/tax-withholdings — list with filters ─────────────
router.get('/', authenticate, MANAGER, async (req, res) => {
  const { type, agency, sale_id, from, to } = req.query;

  let query = supabase
    .from('tax_withholdings')
    .select('*, sales(date, total), users!created_by(name)')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  if (req.user.role !== 'dueno') query = query.eq('branch_id', req.user.branch_id);
  if (type)    query = query.eq('type', type);
  if (agency)  query = query.eq('agency', agency);
  if (sale_id) query = query.eq('sale_id', sale_id);
  if (from)    query = query.gte('created_at', from);
  if (to)      query = query.lte('created_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data ?? []).map((w) => ({
    ...w,
    sale_date:       w.sales?.date   ?? null,
    created_by_name: w.users?.name   ?? null,
  })));
});

// ── POST /api/tax-withholdings — register withholding ────────
router.post('/', authenticate, MANAGER, async (req, res) => {
  const {
    type, agency, sale_id, fiscal_receipt_id,
    base_amount, rate, amount, certificate_number, notes,
  } = req.body;

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type debe ser: ${VALID_TYPES.join(', ')}` });
  }
  if (!agency || !agency.trim()) {
    return res.status(400).json({ error: 'agency es requerido' });
  }
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'amount debe ser mayor a 0' });
  }

  const { data, error } = await supabase
    .from('tax_withholdings')
    .insert([{
      company_id:         req.user.company_id,
      branch_id:          req.user.branch_id,
      sale_id:            sale_id            || null,
      fiscal_receipt_id:  fiscal_receipt_id  || null,
      type,
      agency:             agency.trim().toUpperCase(),
      base_amount:        parseFloat(base_amount || 0),
      rate:               parseFloat(rate         || 0),
      amount:             parseFloat(amount),
      certificate_number: (certificate_number || '').trim() || null,
      notes:              (notes || '').trim(),
      created_by:         req.user.id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── DELETE /api/tax-withholdings/:id ─────────────────────────
router.delete('/:id', authenticate, requireRole('dueno'), async (req, res) => {
  const { error } = await supabase
    .from('tax_withholdings')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Retención/percepción eliminada' });
});

module.exports = router;
