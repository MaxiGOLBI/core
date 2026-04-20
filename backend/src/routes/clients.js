const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/clients
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('clients').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/clients
router.post('/', authenticate, requireRole('vendedor', 'encargado', 'dueno', 'cajero'), async (req, res) => {
  const { name, discount_rules } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabase
    .from('clients')
    .insert([{ name, discount_rules: discount_rules ?? {} }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/clients/:id
router.put('/:id', authenticate, requireRole('vendedor', 'encargado', 'dueno', 'cajero'), async (req, res) => {
  const { name, discount_rules } = req.body;

  const { data, error } = await supabase
    .from('clients')
    .update({ name, discount_rules })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/clients/:id
router.delete('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { error } = await supabase.from('clients').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Client deleted' });
});

module.exports = router;
