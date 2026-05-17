const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// Dedicated client for signInWithPassword / refreshSession.
// These calls mutate the client's internal auth session, which would replace the
// service-role Authorization header on the shared client and trigger RLS on every
// subsequent DB query. Using a separate instance keeps the shared client clean.
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Enriches a profile with allowed_views from role_permissions (if custom rules exist)
async function enrichProfile(profile) {
  if (!profile || profile.role === 'dueno') return profile;
  const { data: perms } = await supabase
    .from('role_permissions')
    .select('allowed_views')
    .eq('company_id', profile.company_id)
    .eq('role', profile.role)
    .maybeSingle();
  if (perms?.allowed_views?.length) {
    return { ...profile, allowed_views: perms.allowed_views };
  }
  return profile;
}

// POST /api/auth/login — exchange credentials for session via Supabase Auth
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  // Fetch user profile for role
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, name, email, role, commission_balance, company_id, branch_id')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ error: 'Usuario no encontrado en el sistema. Contactá al administrador.' });
  }

  if (!profile.company_id) {
    return res.status(403).json({ error: 'Cuenta sin empresa asignada. Contactá al administrador.' });
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: await enrichProfile(profile),
  });
});

// POST /api/auth/refresh — exchange refresh_token for new access_token
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token });
  if (error || !data.session) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role, commission_balance, company_id, branch_id')
    .eq('id', data.user.id)
    .single();

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: await enrichProfile(profile),
  });
});

// GET /api/auth/me — returns fresh profile for the authenticated user
router.get('/me', authenticate, async (req, res) => {
  const { data: profile, error } = await supabase
    .from('users')
    .select('id, name, email, role, commission_balance, company_id, branch_id')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(await enrichProfile(profile));
});

// POST /api/auth/logout — token invalidation is handled client-side
// The publishable key does not allow admin signOut; the frontend clears storage
router.post('/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
