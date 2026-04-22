'use strict';

// ARCA configuration routes — only the dueño can configure the central ARCA connection [SFT, CA]

const { Router } = require('express');
const supabase   = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { getAccessTicket }           = require('../services/afip/wsaa');
const { getArcaConfig, invalidateArcaCache } = require('../config/arcaConfig');

const router = Router();

// GET /api/arca/status — current ARCA connection status (dueno only)
router.get('/status', authenticate, requireRole('dueno'), async (req, res) => {
  const config = await getArcaConfig();
  if (!config) {
    return res.json({ configured: false, active: false, cuit: null, env: null, last_tested_at: null });
  }
  res.json({ configured: true, ...config });
});

// POST /api/arca/configure — save CUIT + env, test the connection, mark active [IV, REH]
// Body: { cuit, env }
router.post('/configure', authenticate, requireRole('dueno'), async (req, res) => {
  const { cuit, env } = req.body;

  if (!cuit || !env) {
    return res.status(400).json({ error: 'cuit y env son requeridos' });
  }
  if (!['homologation', 'production'].includes(env)) {
    return res.status(400).json({ error: 'env debe ser "homologation" o "production"' });
  }
  if (!/^\d{11}$/.test(String(cuit))) {
    return res.status(400).json({ error: 'El CUIT debe tener exactamente 11 dígitos sin guiones' });
  }

  // Test the connection before saving [REH]
  let testOk    = false;
  let testError = null;
  try {
    await getAccessTicket('wsfe', env);
    testOk = true;
  } catch (err) {
    testError = err.message;
  }

  invalidateArcaCache();

  const { data, error } = await supabase
    .from('arca_config')
    .upsert({
      id:             1,
      cuit:           String(cuit),
      env,
      active:         testOk,
      last_tested_at: new Date().toISOString(),
      configured_by:  req.user.id,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (!testOk) {
    return res.status(422).json({
      warning: `Configuración guardada, pero la conexión con AFIP falló: ${testError}`,
      config:  data,
    });
  }

  res.json({ ok: true, config: data });
});

// POST /api/arca/test — test the existing saved connection (dueno only)
router.post('/test', authenticate, requireRole('dueno'), async (req, res) => {
  const config = await getArcaConfig();
  if (!config) {
    return res.status(404).json({ error: 'ARCA no está configurado. Completá el formulario de configuración primero.' });
  }

  invalidateArcaCache();

  try {
    const { token, sign } = await getAccessTicket('wsfe', config.env);

    await supabase
      .from('arca_config')
      .update({ active: true, last_tested_at: new Date().toISOString() })
      .eq('id', 1);

    invalidateArcaCache();
    res.json({ ok: true, connected: true, hasToken: !!token, hasSign: !!sign });
  } catch (err) {
    await supabase
      .from('arca_config')
      .update({ active: false, last_tested_at: new Date().toISOString() })
      .eq('id', 1);

    invalidateArcaCache();
    res.status(422).json({ error: err.message, connected: false });
  }
});

module.exports = router;
