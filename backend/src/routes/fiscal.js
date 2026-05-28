'use strict';

// Fiscal receipts (comprobantes) routes — WSFE/ARCA integration via WS propio
const { Router } = require('express');
const supabase   = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { getTicket }               = require('../services/wsaa');
const { CBTE_TIPO, getLastVoucher, requestCae } = require('../services/wsfe');
const { generateFacturaPDF }      = require('../services/factura');

const router = Router();
const CASHIER_ROLES = ['cajero', 'encargado', 'dueno'];
const OWNER = requireRole('dueno');

// ── Load AFIP config for a company ───────────────────────────
async function loadAfipConfig(companyId) {
  const { data } = await supabase
    .from('fiscal_config')
    .select('cuit, point_of_sale, cert_pem, key_pem, afip_environment')
    .eq('company_id', companyId)
    .maybeSingle();

  if (!data?.cuit) throw { status: 422, message: 'CUIT no configurado. Ir a Configuración Fiscal.' };

  let certPem = data.cert_pem;
  let keyPem  = data.key_pem;

  // Fallback to environment variables (base64 encoded)
  if (!certPem || !keyPem) {
    const certB64 = process.env.AFIP_CERT_B64;
    const keyB64  = process.env.AFIP_KEY_B64;
    if (!certB64 || !keyB64) {
      throw {
        status: 422,
        message: 'Certificado digital no configurado. Cargarlo en Configuración Fiscal o definir AFIP_CERT_B64 / AFIP_KEY_B64.',
      };
    }
    certPem = Buffer.from(certB64, 'base64').toString('utf-8');
    keyPem  = Buffer.from(keyB64,  'base64').toString('utf-8');
  }

  return {
    cuit:        data.cuit.replace(/\D/g, ''),
    pointOfSale: data.point_of_sale || 1,
    certPem,
    keyPem,
    environment: data.afip_environment || process.env.AFIP_ENV || 'homologacion',
  };
}

// Receipt type labels [CMV]
const RECEIPT_TYPES = ['FA', 'FB', 'FC', 'NCA', 'NCB', 'NCC', 'NDA', 'NDB'];

// ── GET /api/fiscal/receipts — list fiscal receipts ──────────
router.get('/receipts', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { status, receipt_type, from, to, sale_id } = req.query;

  let query = supabase
    .from('fiscal_receipts')
    .select('*, clients(name), sales(date, total), users!created_by(name)')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  if (req.user.role !== 'dueno') query = query.eq('branch_id', req.user.branch_id);
  if (status)       query = query.eq('status', status);
  if (receipt_type) query = query.eq('receipt_type', receipt_type);
  if (sale_id)      query = query.eq('sale_id', sale_id);
  if (from)         query = query.gte('created_at', from);
  if (to)           query = query.lte('created_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data ?? []).map((r) => ({
    ...r,
    client_name_rel:  r.clients?.name    ?? null,
    sale_date:        r.sales?.date      ?? null,
    created_by_name:  r.users?.name      ?? null,
  })));
});

// ── GET /api/fiscal/receipts/:id ─────────────────────────────
router.get('/receipts/:id', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { data, error } = await supabase
    .from('fiscal_receipts')
    .select('*, clients(name), sales(date, total, details_json)')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Comprobante no encontrado' });
  res.json(data);
});

// ── POST /api/fiscal/receipts — create pending receipt ───────
// Creates the receipt record. CAE authorization happens via /authorize endpoint
// once AFIP integration is implemented.
router.post('/receipts', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const {
    sale_id, receipt_type, client_id, client_name, client_cuit,
    client_iva_condition, net_amount, iva_amount, total_amount, point_of_sale,
  } = req.body;

  if (!receipt_type || !RECEIPT_TYPES.includes(receipt_type)) {
    return res.status(400).json({ error: `receipt_type inválido. Válidos: ${RECEIPT_TYPES.join(', ')}` });
  }
  if (!total_amount || isNaN(parseFloat(total_amount))) {
    return res.status(400).json({ error: 'total_amount es requerido' });
  }

  // Get next sequential number for this type + point_of_sale
  const { data: last } = await supabase
    .from('fiscal_receipts')
    .select('number')
    .eq('company_id', req.user.company_id)
    .eq('receipt_type', receipt_type)
    .eq('point_of_sale', point_of_sale || 1)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = (last?.number ?? 0) + 1;

  const { data, error } = await supabase
    .from('fiscal_receipts')
    .insert([{
      company_id:          req.user.company_id,
      branch_id:           req.user.branch_id,
      sale_id:             sale_id              || null,
      receipt_type,
      point_of_sale:       point_of_sale        || 1,
      number:              nextNumber,
      client_id:           client_id            || null,
      client_name:         (client_name         || '').trim(),
      client_cuit:         (client_cuit         || '').trim(),
      client_iva_condition: client_iva_condition || 'consumidor_final',
      net_amount:          parseFloat(net_amount    || 0),
      iva_amount:          parseFloat(iva_amount    || 0),
      total_amount:        parseFloat(total_amount),
      status:              'pending',
      created_by:          req.user.id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── POST /api/fiscal/receipts/:id/authorize — request CAE via WSFE ──
router.post('/receipts/:id/authorize', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  const { data: receipt } = await supabase
    .from('fiscal_receipts')
    .select('*')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .maybeSingle();

  if (!receipt) return res.status(404).json({ error: 'Comprobante no encontrado' });
  if (receipt.status === 'authorized') {
    return res.status(400).json({ error: 'El comprobante ya está autorizado', cae: receipt.cae });
  }
  if (receipt.status === 'rejected') {
    return res.status(400).json({ error: 'El comprobante fue rechazado por AFIP. Crear uno nuevo.' });
  }

  let afipConfig;
  try {
    afipConfig = await loadAfipConfig(req.user.company_id);
  } catch (err) {
    return res.status(err.status || 422).json({ error: err.message, code: 'AFIP_NOT_CONFIGURED' });
  }

  const cbteTipo = CBTE_TIPO[receipt.receipt_type];
  if (!cbteTipo) {
    return res.status(400).json({ error: `Tipo de comprobante desconocido: ${receipt.receipt_type}` });
  }

  try {
    // 1. Get WSAA ticket
    const ticket = await getTicket({
      cuit:        afipConfig.cuit,
      certPem:     afipConfig.certPem,
      keyPem:      afipConfig.keyPem,
      service:     'wsfe',
      environment: afipConfig.environment,
    });

    // 2. Verify consecutive number with AFIP
    const lastNumber = await getLastVoucher(
      { cuit: afipConfig.cuit, environment: afipConfig.environment },
      ticket.token, ticket.sign,
      afipConfig.pointOfSale, cbteTipo
    );
    const expectedNumber = lastNumber + 1;

    if (receipt.number !== expectedNumber) {
      return res.status(409).json({
        error: `Número de comprobante inconsistente. AFIP espera el ${expectedNumber}, el sistema tiene el ${receipt.number}.`,
        expected: expectedNumber,
        stored:   receipt.number,
      });
    }

    // 3. Determine DocTipo / DocNro from client
    const cuitClean = (receipt.client_cuit || '').replace(/\D/g, '');
    const docTipo   = cuitClean.length === 11 ? 80 : 99; // 80=CUIT, 99=Consumidor Final
    const docNro    = cuitClean.length === 11 ? parseInt(cuitClean) : 0;

    // 4. Request CAE
    const caeResult = await requestCae(
      { cuit: afipConfig.cuit, environment: afipConfig.environment },
      ticket.token, ticket.sign,
      {
        point_of_sale: afipConfig.pointOfSale,
        cbte_tipo:     cbteTipo,
        number:        receipt.number,
        doc_tipo:      docTipo,
        doc_nro:       docNro,
        total_amount:  parseFloat(receipt.total_amount),
        net_amount:    parseFloat(receipt.net_amount || 0),
        iva_amount:    parseFloat(receipt.iva_amount || 0),
      }
    );

    // 5. Persist CAE in DB
    const { data: updated, error } = await supabase
      .from('fiscal_receipts')
      .update({
        cae:        caeResult.cae,
        cae_expiry: caeResult.cae_expiry,
        status:     'authorized',
        afip_error: null,
      })
      .eq('id', req.params.id)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(updated);

  } catch (err) {
    console.error('[fiscal/authorize] AFIP error:', err.message);

    // Persist rejection so the user knows what AFIP said
    await supabase
      .from('fiscal_receipts')
      .update({ status: 'rejected', afip_error: err.message })
      .eq('id', req.params.id);

    return res.status(502).json({
      error: err.message,
      code:  'AFIP_ERROR',
    });
  }
});

// ── GET /api/fiscal/config — get fiscal config ────────────────
router.get('/config', authenticate, OWNER, async (req, res) => {
  const { data } = await supabase
    .from('fiscal_config')
    .select('*')
    .eq('company_id', req.user.company_id)
    .maybeSingle();

  res.json(data ?? { company_id: req.user.company_id, cuit: '', point_of_sale: 1, integration_type: null });
});

// ── PUT /api/fiscal/config — save fiscal config ───────────────
router.put('/config', authenticate, OWNER, async (req, res) => {
  const { cuit, point_of_sale, afip_environment, cert_pem, key_pem } = req.body;

  const payload = {
    company_id:       req.user.company_id,
    cuit:             (cuit || '').trim(),
    point_of_sale:    point_of_sale || 1,
    afip_environment: afip_environment || 'homologacion',
    updated_at:       new Date().toISOString(),
  };

  // Only update cert/key if provided (avoid wiping on partial save)
  if (cert_pem && cert_pem.trim()) payload.cert_pem = cert_pem.trim();
  if (key_pem  && key_pem.trim())  payload.key_pem  = key_pem.trim();

  const { data, error } = await supabase
    .from('fiscal_config')
    .upsert(payload, { onConflict: 'company_id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Never return cert/key in response
  const { cert_pem: _c, key_pem: _k, ...safe } = data;
  res.json({ ...safe, has_cert: !!data.cert_pem, has_key: !!data.key_pem });
});

// ── GET /api/fiscal/receipts/:id/pdf — generate factura PDF ──
router.get('/receipts/:id/pdf', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  // Fetch receipt
  const { data: receipt, error } = await supabase
    .from('fiscal_receipts')
    .select('*, clients(name, cuit), sales(details_json)')
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .maybeSingle();

  if (error || !receipt) return res.status(404).json({ error: 'Comprobante no encontrado' });

  // Fetch company + fiscal config for header
  const { data: config } = await supabase
    .from('fiscal_config')
    .select('cuit, point_of_sale')
    .eq('company_id', req.user.company_id)
    .maybeSingle();

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', req.user.company_id)
    .maybeSingle();

  // Build items from linked sale's details_json (if available)
  const items = (receipt.sales?.details_json ?? []).map((item) => ({
    name:       item.product_name || item.name || '—',
    qty:        item.qty || 1,
    price:      item.price ?? item.unitPrice ?? 0,
  }));

  // Enrich receipt with cbte_tipo (needed for QR)
  const enriched = {
    ...receipt,
    _cbte_tipo:   CBTE_TIPO[receipt.receipt_type] ?? 0,
    client_name:  receipt.client_name || receipt.clients?.name || 'Consumidor Final',
    client_cuit:  receipt.client_cuit || receipt.clients?.cuit || '',
    items,
  };

  try {
    const pdfBuffer = await generateFacturaPDF(enriched, {
      storeName: company?.name || process.env.STORE_NAME || 'Mi Comercio',
      storeCuit: config?.cuit  || '',
      storeAddr: process.env.STORE_ADDRESS || '',
      storeIva:  'Responsable Inscripto',
    });

    const docNumber = `${String(receipt.point_of_sale).padStart(4,'0')}-${String(receipt.number).padStart(8,'0')}`;
    const filename  = `factura-${receipt.receipt_type}-${docNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('[factura-pdf]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
