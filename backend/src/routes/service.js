const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const SELECT = `
  id, company_id, branch_id, table_queue_id,
  client_name, client_phone,
  device_description, service_description, notes,
  total_amount, deposit_amount, status,
  arrival_date,
  created_by, assigned_to,
  created_at, updated_at, completed_at,
  creator:users!created_by(name),
  assignee:users!assigned_to(name),
  branch:branches(name)
`;

// GET /api/service-orders
router.get('/', authenticate, async (req, res) => {
  const { status, branch_id } = req.query;

  let query = supabase
    .from('service_orders')
    .select(SELECT)
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  // Non-owners only see their own branch
  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/service-orders/:id
router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('service_orders')
    .select(SELECT)
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// POST /api/service-orders
router.post('/', authenticate, async (req, res) => {
  const {
    client_name, client_phone,
    device_description, service_description, notes,
    total_amount, deposit_amount,
    arrival_date,
    assigned_to, table_queue_id,
  } = req.body;

  if (!client_name?.trim())       return res.status(400).json({ error: 'client_name es requerido' });
  if (!device_description?.trim()) return res.status(400).json({ error: 'device_description es requerido' });

  const branch_id = req.user.role === 'dueno'
    ? (req.body.branch_id || req.user.branch_id)
    : req.user.branch_id;

  const { data, error } = await supabase
    .from('service_orders')
    .insert([{
      company_id:          req.user.company_id,
      branch_id,
      table_queue_id:      table_queue_id ?? null,
      client_name:         client_name.trim(),
      client_phone:        client_phone?.trim() ?? null,
      device_description:  device_description.trim(),
      service_description: service_description?.trim() ?? null,
      notes:               notes?.trim() ?? null,
      total_amount:        parseFloat(total_amount) || 0,
      deposit_amount:      parseFloat(deposit_amount) || 0,
      arrival_date:        arrival_date ?? new Date().toISOString().slice(0, 10),
      status:              'pending',
      created_by:          req.user.id,
      assigned_to:         assigned_to ?? null,
    }])
    .select(SELECT)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/service-orders/:id — update fields or status
router.put('/:id', authenticate, async (req, res) => {
  const {
    client_name, client_phone,
    device_description, service_description, notes,
    total_amount, deposit_amount,
    arrival_date,
    status, assigned_to,
    additional_payment, // extra payment from client on pickup
  } = req.body;

  const VALID_STATUSES = ['pending', 'in_progress', 'ready', 'completed', 'cancelled'];
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  // Fetch current record first
  const { data: current, error: fetchErr } = await supabase
    .from('service_orders')
    .select('*')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (fetchErr || !current) return res.status(404).json({ error: 'Not found' });

  const update = { updated_at: new Date().toISOString() };

  if (client_name !== undefined)         update.client_name         = client_name.trim();
  if (client_phone !== undefined)        update.client_phone        = client_phone?.trim() ?? null;
  if (device_description !== undefined)  update.device_description  = device_description.trim();
  if (service_description !== undefined) update.service_description = service_description?.trim() ?? null;
  if (notes !== undefined)               update.notes               = notes?.trim() ?? null;
  if (total_amount !== undefined)        update.total_amount        = parseFloat(total_amount) || 0;
  if (arrival_date !== undefined)        update.arrival_date        = arrival_date ?? null;
  if (assigned_to !== undefined)         update.assigned_to         = assigned_to ?? null;

  // Acumulate deposit if additional_payment provided
  if (additional_payment != null) {
    update.deposit_amount = (parseFloat(current.deposit_amount) || 0) + (parseFloat(additional_payment) || 0);
  } else if (deposit_amount !== undefined) {
    update.deposit_amount = parseFloat(deposit_amount) || 0;
  }

  if (status) {
    update.status = status;
    if (status === 'completed') {
      update.completed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('service_orders')
    .update(update)
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select(SELECT)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/service-orders/:id — encargado/dueno only
router.delete('/:id', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  const { error } = await supabase
    .from('service_orders')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted' });
});

module.exports = router;
