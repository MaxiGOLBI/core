const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/sales — history with optional filters
router.get('/', authenticate, async (req, res) => {
  const { from, to, seller_id, product_id, client_id } = req.query;

  let query = supabase
    .from('sales')
    .select('*, users!seller_id(name), clients(name)')
    .order('date', { ascending: false });

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  if (seller_id) query = query.eq('seller_id', seller_id);
  if (client_id) query = query.eq('client_id', client_id);

  // Vendors only see their own sales
  if (req.user.role === 'vendedor') {
    query = query.eq('seller_id', req.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Optional product filter via details_json
  if (product_id) {
    const filtered = data.filter((sale) => {
      const details = sale.details_json || [];
      return details.some((d) => d.product_id === product_id);
    });
    return res.json(filtered);
  }

  res.json(data);
});

// GET /api/sales/export — export CSV/XLSX (encargado/dueno only)
router.get('/export', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { from, to, format = 'csv' } = req.query;

  let query = supabase
    .from('sales')
    .select('id, date, total, seller_id, cashier_id, client_id, details_json')
    .order('date', { ascending: false });

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  if (format === 'csv') {
    const headers = ['id', 'date', 'total', 'seller_id', 'cashier_id', 'client_id'];
    const rows = data.map((s) =>
      headers.map((h) => (s[h] != null ? String(s[h]) : '')).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_export.csv"');
    return res.send(csv);
  }

  // Return JSON for XLSX (client-side generation)
  res.json(data);
});

module.exports = router;
