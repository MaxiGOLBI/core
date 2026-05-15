// Middleware: verify Supabase JWT and attach user + role to req
const { createClient } = require('@supabase/supabase-js');

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Fetch role, company and branch from users table
  const { data: profile, error: profileError } = await supabaseAuth
    .from('users')
    .select('role, company_id, branch_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ error: 'User profile not found' });
  }

  if (!profile.company_id) {
    return res.status(403).json({ error: 'Cuenta sin empresa asignada. Contactá al administrador.' });
  }

  // Non-owner roles must have a branch assigned [SFT]
  if (profile.role !== 'dueno' && !profile.branch_id) {
    return res.status(403).json({ error: 'Usuario sin sucursal asignada. Contactá al administrador.' });
  }

  req.user = {
    id:         user.id,
    email:      user.email,
    role:       profile.role,
    company_id: profile.company_id,
    branch_id:  profile.branch_id ?? null,
  };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
