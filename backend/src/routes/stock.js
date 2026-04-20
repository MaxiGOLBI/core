const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// Stock threshold constants [CMV]
const STOCK_THRESHOLD_GREEN = 50;
const STOCK_THRESHOLD_YELLOW = 15;

function stockLevel(qty) {
  if (qty > STOCK_THRESHOLD_GREEN) return 'green';
  if (qty > STOCK_THRESHOLD_YELLOW) return 'yellow';
  return 'red';
}

// GET /api/stock — list products with color thresholds; optional ?search= filter
router.get('/', authenticate, async (req, res) => {
  const { search } = req.query;

  let query = supabase
    .from('products')
    .select('id, code, name, price, stock, commission_default')
    .order('name');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  const result = data.map((p) => ({ ...p, stock_level: stockLevel(p.stock) }));
  res.json(result);
});

// PATCH /api/stock/:id — adjust stock quantity
router.patch('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (stock == null || stock < 0) {
    return res.status(400).json({ error: 'Valid stock quantity required' });
  }

  const { data, error } = await supabase
    .from('products')
    .update({ stock })
    .eq('id', id)
    .select('id, code, name, stock')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...data, stock_level: stockLevel(data.stock) });
});

module.exports = router;
