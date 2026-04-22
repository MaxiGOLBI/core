'use strict';

// AFIP routes: authentication ticket, sample ticket PDF, and CAE invoice requests [SFT, CA]

const { Router }    = require('express');
const supabase      = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { getAccessTicket }           = require('../services/afip/wsaa');
const { requestCAE }                = require('../services/afip/wsfev1');
const { generateTicketPDF }         = require('../services/ticket');
const { getArcaConfig }             = require('../config/arcaConfig');

const CASHIER_ROLES = ['cajero', 'encargado', 'dueno'];

const router = Router();

// GET /api/afip/ticket — verify WSAA auth works
router.get('/ticket', authenticate, requireRole('encargado', 'dueno'), async (req, res) => {
  try {
    const { token, sign } = await getAccessTicket('wsfe');
    res.json({ authenticated: true, hasToken: !!token, hasSign: !!sign });
  } catch (err) {
    console.error('[AFIP] Ticket error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/afip/ticket-pdf — generate a sample (non-fiscal) receipt PDF [IV, REH]
// Body: { tableNumber, sellerName, cashierName, items, total, date }
router.post('/ticket-pdf', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  try {
    const { tableNumber, items, total } = req.body;

    if (!tableNumber || !Array.isArray(items) || total === undefined) {
      return res.status(400).json({ error: 'tableNumber, items and total are required' });
    }

    const now = new Date().toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const pdfBuffer = await generateTicketPDF({
      tableNumber,
      sellerName:  req.body.sellerName  || '—',
      cashierName: req.body.cashierName || req.user.email,
      items,
      total,
      date: req.body.date || now,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ticket-${tableNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('[AFIP] Ticket PDF error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/afip/cae — request a CAE for a single invoice [IV, REH]
// Body: { impNeto, impTotal, impIVA?, ptoVta?, cbteTipo?, concepto?, docTipo?, docNro?, cbteDate?, sale_id? }
// If sale_id is provided, saves the CAE result to the sales table [DRY]
router.post('/cae', authenticate, requireRole(...CASHIER_ROLES), async (req, res) => {
  try {
    const { impNeto, impTotal, sale_id } = req.body;

    // Verify ARCA is configured and active [SFT]
    const arcaConfig = await getArcaConfig();
    if (!arcaConfig || !arcaConfig.active) {
      return res.status(503).json({
        error: 'ARCA no está configurado. El dueño debe configurar la conexión en la sección Conexiones.',
      });
    }

    if (impNeto === undefined || impTotal === undefined) {
      return res.status(400).json({ error: 'impNeto and impTotal are required' });
    }
    if (typeof impNeto !== 'number' || typeof impTotal !== 'number') {
      return res.status(400).json({ error: 'impNeto and impTotal must be numbers' });
    }
    if (impTotal <= 0 || impNeto < 0) {
      return res.status(400).json({ error: 'Invalid invoice amounts' });
    }

    const result = await requestCAE(req.body, arcaConfig);

    // Persist CAE to the sale record if sale_id was provided [RM]
    if (sale_id) {
      const { error: updateErr } = await supabase
        .from('sales')
        .update({ cae: result.cae, cae_vto: result.caeVtto })
        .eq('id', sale_id);

      if (updateErr) {
        console.error('[AFIP] Could not save CAE to sale:', updateErr.message);
        // Non-fatal: return result anyway so the cashier can note it manually
      }
    }

    res.json(result);
  } catch (err) {
    console.error('[AFIP] CAE error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
