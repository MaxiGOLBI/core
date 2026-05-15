const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/commissions — list commission rules per product
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('commissions')
    .select('*, products(name, code)')
    .eq('company_id', req.user.company_id)
    .order('product_id');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/commissions/history — seller's own commission history from completed sales
// vendedor: always own. encargado/dueno: any seller via ?seller_id=UUID
router.get('/history', authenticate, async (req, res) => {
  let sellerId = req.user.id;
  if (req.query.seller_id && ['encargado', 'dueno'].includes(req.user.role)) {
    sellerId = req.query.seller_id;
  }

  const { from, to } = req.query;

  let query = supabase
    .from('sales')
    .select('id, date, total, details_json, branch_id')
    .eq('company_id', req.user.company_id)
    .eq('seller_id', sellerId)
    .order('date', { ascending: false });

  if (from) query = query.gte('date', from);
  if (to)   query = query.lte('date', to + 'T23:59:59');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Collect product IDs for enrichment
  const productIds = new Set();
  (data ?? []).forEach(s =>
    (s.details_json ?? []).forEach(i => { if (i.product_id) productIds.add(i.product_id); })
  );

  let productMap = {};
  let commissionRuleMap = {};
  if (productIds.size > 0) {
    const [{ data: prods }, { data: commRules }] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, commission_default')
        .in('id', [...productIds]),
      supabase
        .from('commissions')
        .select('product_id, commission_per_unit')
        .in('product_id', [...productIds])
        .eq('company_id', req.user.company_id)
        .eq('active', true),
    ]);
    if (prods) prods.forEach(p => { productMap[p.id] = p; });
    if (commRules) commRules.forEach(r => { commissionRuleMap[r.product_id] = r; });
  }

  const enriched = (data ?? []).map(sale => {
    const items = (sale.details_json ?? []).map(item => {
      const prod     = productMap[item.product_id] ?? {};
      const commRule = commissionRuleMap[item.product_id];
      const commPerUnit = Number(
        item.commission_per_unit ??
        item.commission_value ??
        commRule?.commission_per_unit ??
        prod.commission_default ??
        0
      );
      const commEarned  = (item.qty ?? 1) * commPerUnit;
      return {
        ...item,
        product_name:        item.product_name ?? prod.name ?? '—',
        commission_per_unit: commPerUnit,
        commission_earned:   commEarned,
      };
    });
    const totalCommission = items.reduce((s, i) => s + i.commission_earned, 0);
    return { ...sale, details_json: items, commission_earned: totalCommission };
  });

  res.json(enriched);
});

// POST /api/commissions
router.post('/', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { product_id, commission_per_unit, active } = req.body;

  if (!product_id || commission_per_unit == null) {
    return res.status(400).json({ error: 'product_id and commission_per_unit are required' });
  }

  const { data, error } = await supabase
    .from('commissions')
    .insert([{ product_id, commission_per_unit, active: active ?? true, company_id: req.user.company_id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/commissions/:id
router.put('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { commission_per_unit, active } = req.body;

  const { data, error } = await supabase
    .from('commissions')
    .update({ commission_per_unit, active })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/commissions/:id
router.delete('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { error } = await supabase.from('commissions').delete().eq('id', req.params.id).eq('company_id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Commission deleted' });
});

// GET /api/commissions/balances — show current balances per seller
router.get('/balances', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, branch_id, commission_balance')
    .neq('role', 'dueno')
    .eq('company_id', req.user.company_id)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/commissions/team — all employees commission totals for a date range (encargado/dueno)
router.get('/team', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { from, to } = req.query;

  // 1. Get all non-dueno employees (encargado only sees their own branch)
  let empQuery = supabase
    .from('users')
    .select('id, name, role, branch_id')
    .neq('role', 'dueno')
    .eq('company_id', req.user.company_id)
    .order('name');
  if (req.user.role === 'encargado' && req.user.branch_id) {
    empQuery = empQuery.eq('branch_id', req.user.branch_id);
  }
  const { data: employees, error: empErr } = await empQuery;

  if (empErr) return res.status(500).json({ error: empErr.message });
  if (!employees || employees.length === 0) return res.json([]);

  // 2. Get all sales for those employees in the range
  const sellerIds = employees.map(e => e.id);
  let salesQuery = supabase
    .from('sales')
    .select('id, date, total, details_json, seller_id, branch_id')
    .eq('company_id', req.user.company_id)
    .in('seller_id', sellerIds)
    .order('date', { ascending: false });

  if (from) salesQuery = salesQuery.gte('date', from);
  if (to)   salesQuery = salesQuery.lte('date', to + 'T23:59:59');

  const { data: sales, error: salesErr } = await salesQuery;
  if (salesErr) return res.status(500).json({ error: salesErr.message });

  // 3. Collect product IDs for enrichment
  const productIds = new Set();
  (sales ?? []).forEach(s =>
    (s.details_json ?? []).forEach(i => { if (i.product_id) productIds.add(i.product_id); })
  );

  let productMap = {};
  let commissionRuleMap = {};
  if (productIds.size > 0) {
    const [{ data: prods }, { data: commRules }] = await Promise.all([
      supabase.from('products').select('id, name, commission_default').in('id', [...productIds]),
      supabase.from('commissions').select('product_id, commission_per_unit')
        .in('product_id', [...productIds])
        .eq('company_id', req.user.company_id)
        .eq('active', true),
    ]);
    if (prods) prods.forEach(p => { productMap[p.id] = p; });
    if (commRules) commRules.forEach(r => { commissionRuleMap[r.product_id] = r; });
  }

  // 4. Group sales by seller and calculate commissions
  const byEmployee = {};
  employees.forEach(e => { byEmployee[e.id] = { ...e, sales: [], total_commission: 0 }; });

  (sales ?? []).forEach(sale => {
    const emp = byEmployee[sale.seller_id];
    if (!emp) return;
    const items = (sale.details_json ?? []).map(item => {
      const prod     = productMap[item.product_id] ?? {};
      const commRule = commissionRuleMap[item.product_id];
      const commPerUnit = Number(
        item.commission_per_unit ?? item.commission_value ??
        commRule?.commission_per_unit ?? prod.commission_default ?? 0
      );
      const commEarned = (item.qty ?? 1) * commPerUnit;
      return { ...item, product_name: item.product_name ?? prod.name ?? '—', commission_per_unit: commPerUnit, commission_earned: commEarned };
    });
    const saleCommission = items.reduce((s, i) => s + i.commission_earned, 0);
    emp.sales.push({ ...sale, details_json: items, commission_earned: saleCommission });
    emp.total_commission += saleCommission;
  });

  res.json(Object.values(byEmployee));
});

module.exports = router;
