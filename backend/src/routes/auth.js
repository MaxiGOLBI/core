const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login — exchange credentials for session via Supabase Auth
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  // Fetch user profile for role
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role, commission_balance, company_id, branch_id')
    .eq('id', data.user.id)
    .single();

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: profile,
  });
});

// POST /api/auth/refresh — exchange refresh_token for new access_token
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error || !data.session) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role, commission_balance, company_id, branch_id')
    .eq('id', data.user.id)
    .single();

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: profile,
  });
});

// POST /api/auth/logout — token invalidation is handled client-side
// The publishable key does not allow admin signOut; the frontend clears storage
router.post('/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
