const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// Only the owner (dueno) manages expenses
const OWNER = requireRole('dueno');

// GET /api/expenses  — supports ?date=, ?from=, ?to=, ?category=, ?payment_method=, ?status=, ?type=
router.get('/', authenticate, OWNER, async (req, res) => {
  const { date, from, to, category, payment_method, status, type } = req.query;

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('company_id', req.user.company_id)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (date) {
    query = query.eq('expense_date', date);
  } else {
    if (from) query = query.gte('expense_date', from);
    if (to)   query = query.lte('expense_date', to);
  }

  if (category)        query = query.eq('category', category);
  if (payment_method)  query = query.eq('payment_method', payment_method);
  if (status)          query = query.eq('status', status);
  if (type)            query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/expenses
router.post('/', authenticate, OWNER, async (req, res) => {
  const {
    category, description, amount, expense_date,
    supplier, due_date, payment_method, payment_date,
    voucher_type, voucher_number, status, comment, type,
  } = req.body;

  if (amount === undefined || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const recordType = ['gasto', 'ingreso'].includes(type) ? type : 'gasto';

  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      company_id:     req.user.company_id,
      created_by:     req.user.id,
      category:       (category || '').trim(),
      description:    (description || comment || '').trim(),
      comment:        (comment || description || '').trim(),
      amount:         parseFloat(amount),
      expense_date:   expense_date || new Date().toISOString().split('T')[0],
      supplier:       (supplier || '').trim(),
      due_date:       due_date || null,
      payment_method: payment_method || 'efectivo',
      payment_date:   payment_date || null,
      voucher_type:   voucher_type || null,
      voucher_number: (voucher_number || '').trim() || null,
      status:         status || 'paid',
      type:           recordType,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/expenses/:id
router.put('/:id', authenticate, OWNER, async (req, res) => {
  const {
    category, description, amount, expense_date,
    supplier, due_date, payment_method, payment_date,
    voucher_type, voucher_number, status, comment, type,
  } = req.body;

  if (amount === undefined || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const recordType = ['gasto', 'ingreso'].includes(type) ? type : 'gasto';

  const { data, error } = await supabase
    .from('expenses')
    .update({
      category:       (category || '').trim(),
      description:    (description || comment || '').trim(),
      comment:        (comment || description || '').trim(),
      amount:         parseFloat(amount),
      expense_date:   expense_date || new Date().toISOString().split('T')[0],
      supplier:       (supplier || '').trim(),
      due_date:       due_date || null,
      payment_method: payment_method || 'efectivo',
      payment_date:   payment_date || null,
      voucher_type:   voucher_type || null,
      voucher_number: (voucher_number || '').trim() || null,
      status:         status || 'paid',
      type:           recordType,
    })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Expense not found' });
  res.json(data);
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, OWNER, async (req, res) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Expense deleted' });
});

module.exports = router;
