const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// Dueno: full access. Encargado/cajero: read their branch only
const OWNER = requireRole('dueno');
const BRANCH_ROLES = requireRole('dueno', 'encargado', 'cajero');
const BRANCH_WRITE = requireRole('dueno', 'encargado');

// GET /api/expenses  — supports ?date=, ?from=, ?to=, ?category=, ?payment_method=, ?status=, ?type=
router.get('/', authenticate, BRANCH_ROLES, async (req, res) => {
  const { date, from, to, category, payment_method, status, type } = req.query;

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('company_id', req.user.company_id)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  // Non-owner roles only see their own branch
  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  }

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
router.post('/', authenticate, BRANCH_WRITE, async (req, res) => {
  const {
    category, description, amount, expense_date,
    supplier, due_date, payment_method, payment_date,
    voucher_type, voucher_number, status, comment, type,
    iva_rate, iva_amount, other_taxes, percepciones, retenciones,
  } = req.body;

  if (amount === undefined || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const recordType = ['gasto', 'ingreso'].includes(type) ? type : 'gasto';
  const branchId = req.user.role === 'dueno' ? (req.body.branch_id || null) : req.user.branch_id;

  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      company_id:      req.user.company_id,
      created_by:      req.user.id,
      branch_id:       branchId,
      expense_subtype: 'gasto',
      category:        (category || '').trim(),
      description:     (description || comment || '').trim(),
      comment:         (comment || description || '').trim(),
      amount:          parseFloat(amount),
      expense_date:    expense_date || new Date().toISOString().split('T')[0],
      supplier:        (supplier || '').trim(),
      due_date:        due_date || null,
      payment_method:  payment_method || 'efectivo',
      payment_date:    payment_date || null,
      voucher_type:    voucher_type || null,
      voucher_number:  (voucher_number || '').trim() || null,
      status:          status || 'paid',
      type:            recordType,
      iva_rate:        parseFloat(iva_rate || 0),
      iva_amount:      parseFloat(iva_amount || 0),
      other_taxes:     parseFloat(other_taxes || 0),
      percepciones:    parseFloat(percepciones || 0),
      retenciones:     parseFloat(retenciones || 0),
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// POST /api/expenses/stock — stock entry expense: creates expense + items, updates product stock/cost
router.post('/stock', authenticate, BRANCH_WRITE, async (req, res) => {
  const {
    expense_date, supplier, category, comment,
    payment_method, payment_date, status,
    voucher_type, voucher_number,
    iva_rate, iva_amount, other_taxes, percepciones, retenciones,
    items, // [{ product_id, qty, unit_cost }]
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un producto' });
  }

  for (const item of items) {
    if (!item.product_id || !item.qty || item.unit_cost == null) {
      return res.status(400).json({ error: 'Cada ítem requiere product_id, qty y unit_cost' });
    }
    if (parseInt(item.qty) <= 0 || parseFloat(item.unit_cost) < 0) {
      return res.status(400).json({ error: 'qty debe ser positivo y unit_cost no negativo' });
    }
  }

  const branchId = req.user.role === 'dueno' ? (req.body.branch_id || null) : req.user.branch_id;

  const subtotal   = items.reduce((s, i) => s + parseFloat(i.unit_cost) * parseInt(i.qty), 0);
  const totalAmount = subtotal
    + parseFloat(iva_amount    || 0)
    + parseFloat(other_taxes   || 0)
    + parseFloat(percepciones  || 0)
    + parseFloat(retenciones   || 0);

  // 1. Insert the expense record
  const { data: expense, error: expErr } = await supabase
    .from('expenses')
    .insert([{
      company_id:      req.user.company_id,
      created_by:      req.user.id,
      branch_id:       branchId,
      expense_subtype: 'stock',
      type:            'gasto',
      amount:          totalAmount,
      expense_date:    expense_date || new Date().toISOString().split('T')[0],
      supplier:        (supplier || '').trim(),
      category:        (category  || 'Ingreso de stock').trim(),
      comment:         (comment   || '').trim(),
      description:     (comment   || '').trim(),
      payment_method:  payment_method || 'efectivo',
      payment_date:    payment_date   || null,
      voucher_type:    voucher_type   || null,
      voucher_number:  (voucher_number || '').trim() || null,
      status:          status || 'paid',
      iva_rate:        parseFloat(iva_rate    || 0),
      iva_amount:      parseFloat(iva_amount  || 0),
      other_taxes:     parseFloat(other_taxes || 0),
      percepciones:    parseFloat(percepciones || 0),
      retenciones:     parseFloat(retenciones  || 0),
    }])
    .select()
    .single();

  if (expErr) return res.status(500).json({ error: expErr.message });

  // 2. Insert expense_items
  const { error: itemsErr } = await supabase
    .from('expense_items')
    .insert(items.map(i => ({
      expense_id: expense.id,
      product_id: i.product_id,
      qty:        parseInt(i.qty),
      unit_cost:  parseFloat(i.unit_cost),
    })));

  if (itemsErr) return res.status(500).json({ error: itemsErr.message });

  // 3. Update each product: increment stock + update cost_price to latest
  for (const item of items) {
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .eq('company_id', req.user.company_id)
      .single();

    if (!product) continue;

    await supabase
      .from('products')
      .update({
        stock:      product.stock + parseInt(item.qty),
        cost_price: parseFloat(item.unit_cost),
      })
      .eq('id', item.product_id)
      .eq('company_id', req.user.company_id);
  }

  res.status(201).json(expense);
});

// GET /api/expenses/:id/items — items of a stock expense
router.get('/:id/items', authenticate, BRANCH_ROLES, async (req, res) => {
  const { data, error } = await supabase
    .from('expense_items')
    .select('id, qty, unit_cost, product_id, products(id, name, code)')
    .eq('expense_id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// PUT /api/expenses/:id
router.put('/:id', authenticate, BRANCH_WRITE, async (req, res) => {
  const {
    category, description, amount, expense_date,
    supplier, due_date, payment_method, payment_date,
    voucher_type, voucher_number, status, comment, type,
    iva_rate, iva_amount, other_taxes, percepciones, retenciones,
  } = req.body;

  if (amount === undefined || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const recordType = ['gasto', 'ingreso'].includes(type) ? type : 'gasto';

  let updateQuery = supabase
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
      iva_rate:       parseFloat(iva_rate    || 0),
      iva_amount:     parseFloat(iva_amount  || 0),
      other_taxes:    parseFloat(other_taxes || 0),
      percepciones:   parseFloat(percepciones || 0),
      retenciones:    parseFloat(retenciones  || 0),
    })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);

  // Encargado can only update expenses from their own branch
  if (req.user.role !== 'dueno') {
    updateQuery = updateQuery.eq('branch_id', req.user.branch_id);
  }

  const { data, error } = await updateQuery.select().single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Expense not found' });
  res.json(data);
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, BRANCH_WRITE, async (req, res) => {
  let query = supabase
    .from('expenses')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);

  // Encargado can only delete expenses from their own branch
  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  }

  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Expense deleted' });
});

module.exports = router;
