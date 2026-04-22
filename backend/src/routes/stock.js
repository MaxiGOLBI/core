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
    .select('id, code, name, price, stock, commission_default, faulty_stock')
    .order('name');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  const result = data.map((p) => ({ ...p, stock_level: stockLevel(p.stock) }));
  res.json(result);
});

// PATCH /api/stock/:id — adjust stock, or move units between stock and faulty_stock
// Body options:
//   { stock: N }            — set available stock directly
//   { add_faulty: N }       — move N units from stock → faulty_stock
//   { remove_faulty: N }    — move N units from faulty_stock → stock
router.patch('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { stock, add_faulty, remove_faulty } = req.body;

  // Moving units between stock and faulty_stock requires a read-then-write
  if (add_faulty != null || remove_faulty != null) {
    const { data: current, error: fetchErr } = await supabase
      .from('products')
      .select('stock, faulty_stock')
      .eq('id', id)
      .single();

    if (fetchErr || !current) return res.status(404).json({ error: 'Product not found' });

    let newStock = current.stock;
    let newFaulty = current.faulty_stock ?? 0;

    if (add_faulty != null) {
      const qty = parseInt(add_faulty);
      if (qty <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
      if (qty > newStock) return res.status(400).json({ error: 'No hay suficiente stock disponible' });
      newStock -= qty;
      newFaulty += qty;
    }

    if (remove_faulty != null) {
      const qty = parseInt(remove_faulty);
      if (qty <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
      if (qty > newFaulty) return res.status(400).json({ error: 'No hay suficiente stock con fallas' });
      newFaulty -= qty;
      newStock += qty;
    }

    const { data, error } = await supabase
      .from('products')
      .update({ stock: newStock, faulty_stock: newFaulty })
      .eq('id', id)
      .select('id, code, name, stock, faulty_stock')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ...data, stock_level: stockLevel(data.stock) });
  }

  // Direct stock update
  if (stock != null) {
    if (stock < 0) return res.status(400).json({ error: 'Valid stock quantity required' });

    const { data, error } = await supabase
      .from('products')
      .update({ stock })
      .eq('id', id)
      .select('id, code, name, stock, faulty_stock')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ...data, stock_level: stockLevel(data.stock) });
  }

  return res.status(400).json({ error: 'No valid fields to update' });
});

module.exports = router;
