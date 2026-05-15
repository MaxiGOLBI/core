'use strict';

// Ticket PDF generator — produces a thermal-style receipt (80mm / 226pt wide) [SF, CA]
const PDFDocument = require('pdfkit');

const PAGE_WIDTH = 226; // ~80mm in points
const MARGIN     = 14;
const INNER_W    = PAGE_WIDTH - MARGIN * 2;

// Column X positions within the inner area
const COL = { name: 0, qty: 100, price: 130, total: 178 };

function separator(doc) {
  doc.fontSize(7).font('Helvetica').text('-'.repeat(36), MARGIN, doc.y, { align: 'center' });
  doc.moveDown(0.3);
}

/**
 * Generates a sample receipt PDF and resolves with a Buffer.
 *
 * saleData:
 *   tableNumber  {string|number}
 *   sellerName   {string}
 *   cashierName  {string}
 *   items        [{name, qty, unitPrice, discountValue, discountType}]
 *   total        {number}
 *   date         {string}  formatted date/time string
 */
function generateTicketPDF(saleData) {
  const { tableNumber, sellerName, cashierName, items = [], total, date } = saleData;
  const storeName = process.env.STORE_NAME || 'Mi Comercio';

  return new Promise((resolve, reject) => {
    // Auto page height so it scales with content [SF]
    const doc = new PDFDocument({ size: [PAGE_WIDTH, 1000], margin: MARGIN, autoFirstPage: true });
    const chunks = [];

    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // — Header —
    doc.fontSize(13).font('Helvetica-Bold').text(storeName, MARGIN, MARGIN, { width: INNER_W, align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(7).font('Helvetica').text(date, { width: INNER_W, align: 'center' });
    doc.text(`Ticket #${tableNumber}  |  Vendedor: ${sellerName}`, { width: INNER_W, align: 'center' });
    if (cashierName) doc.text(`Cajero: ${cashierName}`, { width: INNER_W, align: 'center' });
    doc.moveDown(0.5);

    separator(doc);

    // — Column headers —
    const hY = doc.y;
    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('Producto',     MARGIN + COL.name,  hY, { width: 98 });
    doc.text('Cant',         MARGIN + COL.qty,   hY, { width: 28, align: 'right' });
    doc.text('P.Unit',       MARGIN + COL.price, hY, { width: 46, align: 'right' });
    doc.text('Subtotal',     MARGIN + COL.total, hY, { width: 46, align: 'right' });
    doc.moveDown(0.5);

    separator(doc);

    // — Line items —
    doc.font('Helvetica').fontSize(7);
    items.forEach((item) => {
      const base    = (item.qty || 0) * (item.unitPrice || 0);
      const disc    = item.discountType === 'percent'
        ? base * ((item.discountValue || 0) / 100)
        : (item.discountValue || 0);
      const subtotal = base - disc;

      const lineY = doc.y;
      doc.text(item.name || '—',              MARGIN + COL.name,  lineY, { width: 98 });
      doc.text(String(item.qty),              MARGIN + COL.qty,   lineY, { width: 28, align: 'right' });
      doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, MARGIN + COL.price, lineY, { width: 46, align: 'right' });
      doc.text(`$${subtotal.toFixed(2)}`,     MARGIN + COL.total, lineY, { width: 46, align: 'right' });
      doc.moveDown(0.35);

      if (disc > 0) {
        doc.fontSize(6).fillColor('#666666')
          .text(`  Descuento: -$${disc.toFixed(2)}`, MARGIN + COL.name, doc.y, { width: INNER_W })
          .fillColor('#000000').fontSize(7);
        doc.moveDown(0.25);
      }
    });

    separator(doc);

    // — Total —
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica-Bold')
      .text(`TOTAL:  $${Number(total).toFixed(2)}`, MARGIN, doc.y, { width: INNER_W, align: 'right' });
    doc.moveDown(0.6);

    // — Footer —
    separator(doc);
    doc.fontSize(6).font('Helvetica')
      .text('Ticket de muestra – No válido como comprobante fiscal', MARGIN, doc.y, { width: INNER_W, align: 'center' });
    doc.moveDown(0.5);

    doc.end();
  });
}

module.exports = { generateTicketPDF };
