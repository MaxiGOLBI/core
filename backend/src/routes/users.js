const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const VALID_ROLES = ['vendedor', 'cajero', 'encargado', 'dueno'];
const APPROVAL_EMAIL = 'maxigolbanoff@gmail.com';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// Almacén en memoria de solicitudes pendientes: token → { name, email, password, createdAt }
const pendingOwners = new Map();

function cleanExpired() {
  const now = Date.now();
  for (const [token, data] of pendingOwners.entries()) {
    if (now - data.createdAt > TOKEN_TTL_MS) pendingOwners.delete(token);
  }
}

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASS },
  });
}

// POST /api/users/register — solicitud pública de registro como dueno
// Guarda pendiente y envía email de aprobación a maxigolbanoff@gmail.com
router.post('/register', async (req, res) => {
  const { name, email, password, company_name } = req.body;

  if (!name || !email || !password || !company_name) {
    return res.status(400).json({ error: 'name, email, password y company_name son requeridos' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  cleanExpired();

  // Evitar solicitudes duplicadas para el mismo email
  for (const data of pendingOwners.values()) {
    if (data.email === email) {
      return res.status(409).json({
        error: 'Ya hay una solicitud pendiente para ese email. Esperá la aprobación.',
      });
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  pendingOwners.set(token, { name, email, password, company_name, createdAt: Date.now() });

  const appUrl = process.env.APP_URL || 'http://localhost:3001';
  const approveUrl = `${appUrl}/api/users/approve/${token}`;
  const rejectUrl = `${appUrl}/api/users/reject/${token}`;

  try {
    const transporter = createTransporter();
    // Absorb any 'error' events emitted by the internal SMTP socket
    // (unhandled EventEmitter errors crash the Node.js process)
    transporter.on('error', (err) => {
      console.error('[nodemailer] transport error event:', err.message);
    });
    await transporter.sendMail({
      from: `"Core" <${process.env.EMAIL_FROM}>`,
      to: APPROVAL_EMAIL,
      subject: 'Nueva solicitud de registro como Dueño — Core',
      html: `
        <h2>Nueva solicitud de registro</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Empresa:</strong> ${company_name}</p>
        <p>Esta persona quiere registrarse como <strong>Dueño</strong> en Core.</p>
        <br>
        <a href="${approveUrl}" style="background:#16a34a;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin-right:12px;">✅ Aprobar</a>
        &nbsp;
        <a href="${rejectUrl}" style="background:#dc2626;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">❌ Rechazar</a>
        <br><br>
        <p style="color:#888;font-size:12px;">Este link expira en 24 horas.</p>
      `,
    });
  } catch (err) {
    console.error('Error enviando email de aprobación:', err.message);
    pendingOwners.delete(token);
    return res.status(500).json({
      error: 'No se pudo enviar el email de aprobación. Verificá EMAIL_FROM y EMAIL_PASS en .env',
    });
  }

  res.status(202).json({
    message: 'Solicitud enviada. Cuando sea aprobada vas a poder ingresar.',
  });
});

// GET /api/users/approve/:token — aprueba y crea la cuenta de dueno
router.get('/approve/:token', async (req, res) => {
  cleanExpired();
  const pending = pendingOwners.get(req.params.token);
  if (!pending) {
    return res.status(404).send('<h2 style="font-family:sans-serif;color:#dc2626">Link inválido o expirado.</h2>');
  }

  const { name, email, password, company_name } = pending;

  // Intentar crear el usuario. Si ya existe (intento previo fallido), actualizarlo.
  let authUserId;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    const alreadyExists =
      authError.message.toLowerCase().includes('already registered') ||
      authError.message.toLowerCase().includes('already been registered') ||
      authError.message.toLowerCase().includes('already exists');

    if (!alreadyExists) {
      return res.status(400).send(
        `<h2 style="font-family:sans-serif;color:#dc2626">Error al crear usuario: ${authError.message}</h2>`
      );
    }

    // Buscar usuario existente por email
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      return res.status(500).send(
        `<h2 style="font-family:sans-serif;color:#dc2626">Error buscando usuario existente: ${listError.message}</h2>`
      );
    }
    const existing = listData.users.find((u) => u.email === email);
    if (!existing) {
      return res.status(500).send(
        `<h2 style="font-family:sans-serif;color:#dc2626">Usuario reportado como existente pero no encontrado.</h2>`
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      return res.status(500).send(
        `<h2 style="font-family:sans-serif;color:#dc2626">Error actualizando usuario: ${updateError.message}</h2>`
      );
    }
    authUserId = existing.id;
  } else {
    authUserId = authData.user.id;
  }

  // Create the company for this owner [CA]
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert([{ name: company_name }])
    .select('id')
    .single();

  if (companyError) {
    return res.status(500).send(
      `<h2 style="font-family:sans-serif;color:#dc2626">Error creando empresa: ${companyError.message}</h2>`
    );
  }

  const { error: profileError } = await supabase
    .from('users')
    .upsert([{ id: authUserId, name, email, role: 'dueno', commission_balance: 0, company_id: company.id }]);

  if (profileError) {
    return res.status(500).send(
      `<h2 style="font-family:sans-serif;color:#dc2626">Error guardando perfil: ${profileError.message}</h2>`
    );
  }

  pendingOwners.delete(req.params.token);

  res.send(`
    <html><body style="font-family:sans-serif;padding:48px;text-align:center;background:#f9fafb">
      <h1 style="color:#16a34a">✅ Usuario aprobado</h1>
      <p><strong>${name}</strong> (${email}) fue registrado como Dueño de <strong>${company_name}</strong>.</p>
      <p>Ya puede ingresar en Core.</p>
    </body></html>
  `);
});

// GET /api/users/reject/:token — rechaza la solicitud
router.get('/reject/:token', async (req, res) => {
  cleanExpired();
  const pending = pendingOwners.get(req.params.token);
  if (!pending) {
    return res.status(404).send('<h2 style="font-family:sans-serif;color:#dc2626">Link inválido o expirado.</h2>');
  }

  const { name, email } = pending;
  pendingOwners.delete(req.params.token);

  res.send(`
    <html><body style="font-family:sans-serif;padding:48px;text-align:center;background:#f9fafb">
      <h1 style="color:#dc2626">❌ Solicitud rechazada</h1>
      <p>La solicitud de <strong>${name}</strong> (${email}) fue rechazada.</p>
    </body></html>
  `);
});

// GET /api/users — listar usuarios de la misma empresa (filtrado por sucursal si no es dueño)
router.get('/', authenticate, requireRole('vendedor', 'cajero', 'encargado', 'dueno'), async (req, res) => {
  let query = supabase
    .from('users')
    .select('id, name, email, role, commission_balance, branch_id, created_at')
    .eq('company_id', req.user.company_id)
    .order('created_at');

  if (req.user.role !== 'dueno') {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (req.query.branch_id) {
    query = query.eq('branch_id', req.query.branch_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/users — dueno crea un nuevo usuario con rol y sucursal asignados
router.post('/', authenticate, requireRole('dueno'), async (req, res) => {
  const { name, email, password, role, branch_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password y role son requeridos' });
  }
  if (role === 'dueno') {
    return res.status(400).json({ error: 'Para registrar un dueño usá el formulario de registro con aprobación por email.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Rol inválido. Opciones: ${VALID_ROLES.filter(r => r !== 'dueno').join(', ')}` });
  }
  if (!branch_id) {
    return res.status(400).json({ error: 'branch_id (sucursal) es requerido' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (authError) return res.status(400).json({ error: authError.message });

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .upsert([{ id: authData.user.id, name, email, role, commission_balance: 0, company_id: req.user.company_id, branch_id }], { onConflict: 'id' })
    .select()
    .single();

  if (profileError) return res.status(500).json({ error: profileError.message });
  res.status(201).json(profile);
});

// DELETE /api/users/:id — solo dueno puede eliminar usuarios
router.delete('/:id', authenticate, requireRole('dueno'), async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });
  }

  const { error } = await supabase.from('users').delete().eq('id', id).eq('company_id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Usuario eliminado' });
});

// PUT /api/users/:id — solo dueno puede editar nombre, rol y sucursal de un usuario
router.put('/:id', authenticate, requireRole('dueno'), async (req, res) => {
  const { id } = req.params;
  const { name, role, branch_id } = req.body;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'No podés editar tu propio perfil desde aquí' });
  }

  const updates = {};
  if (name && name.trim()) updates.name = name.trim();
  if (role) {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Rol inválido. Opciones: ${VALID_ROLES.join(', ')}` });
    }
    updates.role = role;
  }
  if (branch_id) updates.branch_id = branch_id;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/users/:id/role — solo dueno puede cambiar el rol de un usuario
router.put('/:id/role', authenticate, requireRole('dueno'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Rol inválido. Opciones: ${VALID_ROLES.join(', ')}` });
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: 'No podés cambiar tu propio rol' });
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
