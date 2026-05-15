'use strict';

// Fiscal receipt PDF generator — AFIP-compliant A4 layout [SF, CA]
// Includes: comprobante type (A/B/C), header, items, totals, CAE + QR URL
const PDFDocument = require('pdfkit');

// Receipt type → display label + letter
const TIPO_LABEL = {
  FA: { letra: 'A', nombre: 'FACTURA' },
  FB: { letra: 'B', nombre: 'FACTURA' },
  FC: { letra: 'C', nombre: 'FACTURA' },
  NCA: { letra: 'A', nombre: 'NOTA DE CRÉDITO' },
  NCB: { letra: 'B', nombre: 'NOTA DE CRÉDITO' },
  NCC: { letra: 'C', nombre: 'NOTA DE CRÉDITO' },
  NDA: { letra: 'A', nombre: 'NOTA DE DÉBITO' },
  NDB: { letra: 'B', nombre: 'NOTA DE DÉBITO' },
  NDC: { letra: 'C', nombre: 'NOTA DE DÉBITO' },
};

const IVA_CONDITION = {
  responsable_inscripto: 'Responsable Inscripto',
  monotributo:           'Monotributista',
  consumidor_final:      'Consumidor Final',
  exento:                'Exento',
};

function fmt(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(str) {
  if (!str) return '—';
  const s = str.toString().slice(0, 10);
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// Format invoice number as XXXX-XXXXXXXX
function fmtNumber(pointOfSale, number) {
  return `${String(pointOfSale).padStart(4, '0')}-${String(number).padStart(8, '0')}`;
}

// Build AFIP QR data URL (AFIP Resolution 1702/2018)
function buildQrUrl(receipt, cuit) {
  const data = {
    ver:        1,
    fecha:      receipt.created_at.slice(0, 10),
    cuit:       parseInt(cuit.replace(/\D/g, '')),
    ptoVta:     receipt.point_of_sale,
    tipoCmp:    receipt._cbte_tipo,
    nroCmp:     receipt.number,
    importe:    parseFloat(receipt.total_amount),
    moneda:     'PES',
    ctz:        1,
    tipoDocRec: receipt.client_cuit?.replace(/\D/g, '').length === 11 ? 80 : 99,
    nroDocRec:  parseInt(receipt.client_cuit?.replace(/\D/g, '') || '0') || 0,
    tipoCodAut: 'E',
    codAut:     parseInt(receipt.cae || '0'),
  };
  const b64 = Buffer.from(JSON.stringify(data)).toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
}

/**
 * generateFacturaPDF(receipt, options)
 * receipt: fiscal_receipts row + optional items array + _cbte_tipo number
 * options: { storeName, storeCuit, storeAddress, storeIvaCondition }
 */
function generateFacturaPDF(receipt, options = {}) {
  const tipo       = TIPO_LABEL[receipt.receipt_type] ?? { letra: '?', nombre: 'COMPROBANTE' };
  const storeName  = options.storeName  || process.env.STORE_NAME || 'Mi Comercio';
  const storeCuit  = options.storeCuit  || '—';
  const storeAddr  = options.storeAddr  || '';
  const storeIva   = options.storeIva   || 'Responsable Inscripto';
  const items      = receipt.items ?? [];

  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW  = doc.page.width  - 80; // usable width (40+40 margins)
    const TOP = 40;

    // ── HEADER: two columns (seller info | type letter box) ──────
    // Left column: seller info
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f')
      .text(storeName, 40, TOP, { width: PW * 0.6 });

    doc.fontSize(8).font('Helvetica').fillColor('#333333');
    doc.text(`CUIT: ${storeCuit}`, 40, doc.y + 2, { width: PW * 0.6 });
    if (storeAddr) doc.text(`Domicilio: ${storeAddr}`, { width: PW * 0.6 });
    doc.text(`Condición IVA: ${storeIva}`, { width: PW * 0.6 });

    // Right column: big letter box
    const boxX = 40 + PW * 0.65;
    const boxY = TOP - 4;
    const boxW = PW * 0.35;
    const boxH = 80;

    doc.rect(boxX, boxY, boxW, boxH).strokeColor('#1e3a5f').lineWidth(2).stroke();

    // Type letter (A / B / C)
    doc.fontSize(48).font('Helvetica-Bold').fillColor('#1e3a5f')
      .text(tipo.letra, boxX, boxY + 6, { width: boxW, align: 'center' });

    // Tipo label below the letter
    doc.fontSize(8).font('Helvetica').fillColor('#333333')
      .text(tipo.nombre, boxX, boxY + 58, { width: boxW, align: 'center' });

    const afterHeader = Math.max(doc.y, boxY + boxH) + 10;

    // ── INVOICE NUMBER + DATE ─────────────────────────────────────
    doc.moveTo(40, afterHeader).lineTo(40 + PW, afterHeader).strokeColor('#cccccc').lineWidth(0.5).stroke();

    const rowY = afterHeader + 8;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a5f');
    doc.text(`${tipo.nombre} N°: ${fmtNumber(receipt.point_of_sale, receipt.number)}`, 40, rowY, { width: PW * 0.5 });
    doc.text(`Fecha: ${fmtDate(receipt.created_at)}`, 40 + PW * 0.5, rowY, { width: PW * 0.5, align: 'right' });

    doc.moveTo(40, rowY + 18).lineTo(40 + PW, rowY + 18).strokeColor('#cccccc').stroke();

    // ── CLIENT INFO ───────────────────────────────────────────────
    const clientY = rowY + 26;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#555555')
      .text('DATOS DEL RECEPTOR', 40, clientY);
    doc.font('Helvetica').fillColor('#333333');

    const clientName = receipt.client_name || 'Consumidor Final';
    const clientCuit = receipt.client_cuit || '—';
    const clientIva  = IVA_CONDITION[receipt.client_iva_condition] || 'Consumidor Final';

    doc.text(`Cliente: ${clientName}`, 40, clientY + 12, { width: PW * 0.6 });
    doc.text(`CUIT/DNI: ${clientCuit}`, 40 + PW * 0.6, clientY + 12, { width: PW * 0.4, align: 'right' });
    doc.text(`Condición IVA: ${clientIva}`, 40, clientY + 24, { width: PW });

    doc.moveTo(40, clientY + 38).lineTo(40 + PW, clientY + 38).strokeColor('#cccccc').stroke();

    // ── ITEMS TABLE ───────────────────────────────────────────────
    const tableTop = clientY + 46;

    // Header row
    doc.rect(40, tableTop, PW, 16).fillColor('#1e3a5f').fill();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Descripción',              44, tableTop + 4, { width: PW * 0.50 });
    doc.text('Cant.',      40 + PW * 0.52, tableTop + 4, { width: PW * 0.10, align: 'right' });
    doc.text('Precio unit.',40 + PW * 0.63, tableTop + 4, { width: PW * 0.16, align: 'right' });
    doc.text('Subtotal',   40 + PW * 0.80, tableTop + 4, { width: PW * 0.19, align: 'right' });

    doc.fillColor('#333333');

    let curY = tableTop + 16;

    if (items.length > 0) {
      items.forEach((item, i) => {
        const qty      = parseInt(item.qty || 1);
        const price    = parseFloat(item.price ?? item.unit_price ?? item.unitPrice ?? 0);
        const subtotal = qty * price;

        if (i % 2 === 0) {
          doc.rect(40, curY, PW, 14).fillColor('#f5f8fc').fill();
        }
        doc.font('Helvetica').fontSize(8).fillColor('#333333');
        doc.text(item.name || item.product_name || '—', 44, curY + 3, { width: PW * 0.50 });
        doc.text(String(qty),        40 + PW * 0.52, curY + 3, { width: PW * 0.10, align: 'right' });
        doc.text(fmt(price),         40 + PW * 0.63, curY + 3, { width: PW * 0.16, align: 'right' });
        doc.text(fmt(subtotal),      40 + PW * 0.80, curY + 3, { width: PW * 0.19, align: 'right' });
        curY += 14;
      });
    } else {
      // No items — show a single line with the description
      doc.font('Helvetica').fontSize(8).fillColor('#777777')
        .text('Comprobante de pago', 44, curY + 3, { width: PW });
      curY += 14;
    }

    doc.moveTo(40, curY).lineTo(40 + PW, curY).strokeColor('#cccccc').lineWidth(0.5).stroke();
    curY += 8;

    // ── TOTALS ────────────────────────────────────────────────────
    const totW = PW * 0.38;
    const totX = 40 + PW - totW;
    const netAmount   = parseFloat(receipt.net_amount || 0);
    const ivaAmount   = parseFloat(receipt.iva_amount || 0);
    const totalAmount = parseFloat(receipt.total_amount || 0);

    function totRow(label, value, bold = false) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#333333');
      doc.text(label, totX,            curY, { width: totW * 0.55 });
      doc.text(value, totX + totW * 0.55, curY, { width: totW * 0.45, align: 'right' });
      curY += 14;
    }

    if (netAmount > 0 && ivaAmount > 0) {
      totRow('Subtotal (neto):', fmt(netAmount));
      totRow('IVA 21%:',         fmt(ivaAmount));
      doc.moveTo(totX, curY - 2).lineTo(totX + totW, curY - 2).strokeColor('#cccccc').stroke();
    }
    totRow('TOTAL:', fmt(totalAmount), true);

    curY += 14;
    doc.moveTo(40, curY).lineTo(40 + PW, curY).strokeColor('#cccccc').stroke();
    curY += 12;

    // ── CAE SECTION ───────────────────────────────────────────────
    if (receipt.cae) {
      doc.rect(40, curY, PW, 52).fillColor('#f0f4f8').fill();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e3a5f')
        .text('DATOS DE AUTORIZACIÓN AFIP', 44, curY + 6, { width: PW });

      doc.font('Helvetica').fillColor('#333333').fontSize(8);
      doc.text(`CAE N°: ${receipt.cae}`,                44, curY + 18, { width: PW * 0.5 });
      doc.text(`Vto. CAE: ${fmtDate(receipt.cae_expiry)}`, 44 + PW * 0.5, curY + 18, { width: PW * 0.5, align: 'right' });

      // QR URL (AFIP standard)
      const qrUrl = buildQrUrl(receipt, storeCuit);
      doc.fontSize(6).fillColor('#555555')
        .text(`QR AFIP: ${qrUrl}`, 44, curY + 32, { width: PW, lineBreak: false });

      curY += 58;
    } else {
      // Pending / no CAE
      doc.rect(40, curY, PW, 24).fillColor('#fff3cd').fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#856404')
        .text('⚠ COMPROBANTE PENDIENTE DE AUTORIZACIÓN AFIP — No válido hasta obtener CAE', 44, curY + 8, { width: PW });
      curY += 30;
    }

    // ── FOOTER ────────────────────────────────────────────────────
    curY += 8;
    doc.fontSize(6.5).font('Helvetica').fillColor('#888888')
      .text(
        'Comprobante generado por sistema CRM Core — Este documento es válido únicamente si posee CAE autorizado por AFIP',
        40, curY, { width: PW, align: 'center' }
      );

    doc.end();
  });
}

module.exports = { generateFacturaPDF };
