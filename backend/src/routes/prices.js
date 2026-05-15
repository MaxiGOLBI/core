const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// GET /api/prices — public product price list (no stock, no cost_price)
router.get('/', authenticate, async (req, res) => {
  let query = supabase
    .from('products')
    .select('id, code, name, price, category_id, categories(id, name)')
    .eq('company_id', req.user.company_id)
    .order('name');

  if (req.query.search) {
    query = query.ilike('name', `%${req.query.search}%`);
  }
  if (req.query.category_id) {
    query = query.eq('category_id', req.query.category_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

module.exports = router;
