const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const DEFAULT_VIEWS = {
  vendedor:  ['tables', 'stock', 'sales', 'commissions', 'prices'],
  cajero:    ['tables', 'cashier', 'stock', 'sales', 'commissions', 'prices'],
  encargado: ['tables', 'cashier', 'stock', 'sales', 'commissions', 'employees'],
};

// GET /api/settings — company settings
router.get('/', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .eq('company_id', req.user.company_id)
    .maybeSingle();
  res.json(data ?? { company_id: req.user.company_id, commission_period: 'weekly' });
});

// PUT /api/settings — update company settings (dueno only)
router.put('/', authenticate, requireRole('dueno'), async (req, res) => {
  const { commission_period, role_labels } = req.body;
  if (commission_period && !['daily', 'weekly', 'monthly'].includes(commission_period)) {
    return res.status(400).json({ error: 'Invalid commission_period' });
  }
  const updates = { company_id: req.user.company_id, updated_at: new Date().toISOString() };
  if (commission_period) updates.commission_period = commission_period;
  if (role_labels && typeof role_labels === 'object') updates.role_labels = role_labels;
  const { data, error } = await supabase
    .from('company_settings')
    .upsert(updates, { onConflict: 'company_id' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/settings/role-permissions — get all role permissions (merged with defaults)
router.get('/role-permissions', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { data } = await supabase
    .from('role_permissions')
    .select('role, allowed_views')
    .eq('company_id', req.user.company_id);
  // Start from defaults then override with custom
  const result = JSON.parse(JSON.stringify(DEFAULT_VIEWS));
  (data ?? []).forEach(r => { result[r.role] = r.allowed_views; });
  res.json(result);
});

// PUT /api/settings/role-permissions/:role — update permissions for a role (dueno only)
router.put('/role-permissions/:role', authenticate, requireRole('dueno'), async (req, res) => {
  const { role } = req.params;
  const { allowed_views } = req.body;
  if (!['vendedor', 'cajero', 'encargado'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (!Array.isArray(allowed_views)) {
    return res.status(400).json({ error: 'allowed_views must be an array' });
  }
  const { data, error } = await supabase
    .from('role_permissions')
    .upsert(
      { company_id: req.user.company_id, role, allowed_views },
      { onConflict: 'company_id,role' }
    )
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
