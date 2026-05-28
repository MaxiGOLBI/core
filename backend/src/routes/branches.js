'use strict';

// Branches (sucursales) routes — only the dueño manages branches [SFT, CA]

const { Router } = require('express');
const supabase   = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();

// GET /api/branches — list branches for this company [DRY]
// dueno: sees all; others: just their own (for UI display)
router.get('/', authenticate, async (req, res) => {
  let query = supabase
    .from('branches')
    .select('*')
    .eq('company_id', req.user.company_id)
    .order('created_at');

  if (req.user.role !== 'dueno') {
    query = query.eq('id', req.user.branch_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/branches/:id/stats — get summary stats for a branch (dueno only) [REH]
router.get('/:id/stats', authenticate, requireRole('dueno'), async (req, res) => {
  const { id } = req.params;

  // Verify branch belongs to this company [SFT]
  const { data: branch, error: branchErr } = await supabase
    .from('branches')
    .select('id, name')
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .single();

  if (branchErr || !branch) return res.status(404).json({ error: 'Sucursal no encontrada' });

  const [usersRes, salesRes, productsRes] = await Promise.all([
    supabase.from('users').select('id, name, role, email').eq('branch_id', id),
    supabase
      .from('sales')
      .select('id, total, date')
      .eq('branch_id', id)
      .order('date', { ascending: false })
      .limit(10),
    supabase
      .from('products')
      .select('id, name, stock, price')
      .eq('branch_id', id)
      .order('name'),
  ]);

  res.json({
    branch,
    users:    usersRes.data    ?? [],
    sales:    salesRes.data    ?? [],
    products: productsRes.data ?? [],
    totalSales: salesRes.data?.reduce((s, r) => s + (r.total ?? 0), 0) ?? 0,
  });
});

// POST /api/branches — create a new branch (dueno only) [IV]
router.post('/', authenticate, requireRole('dueno'), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name es requerido' });
  }

  const { data, error } = await supabase
    .from('branches')
    .insert([{ name: name.trim(), company_id: req.user.company_id }])
    .select()
    .single();

  if (error) {
    console.error('[branches POST] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/branches/:id — rename branch (dueno only)
router.put('/:id', authenticate, requireRole('dueno'), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name es requerido' });

  const { data, error } = await supabase
    .from('branches')
    .update({ name: name.trim() })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/branches/:id — delete branch (dueno only) [REH]
router.delete('/:id', authenticate, requireRole('dueno'), async (req, res) => {
  const { id } = req.params;

  // Cannot delete if there are users still assigned [IV]
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', id);

  if (count > 0) {
    return res.status(409).json({
      error: `No se puede eliminar: ${count} usuario(s) están asignados a esta sucursal. Reasigná o eliminá primero.`,
    });
  }

  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', id)
    .eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Sucursal eliminada' });
});

// PUT /api/branches/:id/users/:userId — move a user to a different branch (dueno only)
router.put('/:id/users/:userId', authenticate, requireRole('dueno'), async (req, res) => {
  const { id, userId } = req.params;

  // Verify branch belongs to this company
  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!branch) return res.status(404).json({ error: 'Sucursal no encontrada' });

  const { data, error } = await supabase
    .from('users')
    .update({ branch_id: id })
    .eq('id', userId)
    .eq('company_id', req.user.company_id)
    .select('id, name, role, branch_id')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
