'use strict';

// Remito PDF generator — A4 delivery note format [SF, CA]
const PDFDocument = require('pdfkit');

function generateRemitoPDF(data) {
  const { number, clientName, clientAddress, items = [], notes, date, storeName, createdBy } = data;
  const store = storeName || process.env.STORE_NAME || 'Mi Comercio';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // usable width

    // ── Header ──────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').text(store, 50, 50, { width: W });
    doc.fontSize(10).font('Helvetica').text(`Fecha: ${date}`, { align: 'right' });
    doc.moveDown(0.3);

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e40af')
      .text('REMITO', 50, doc.y, { width: W, align: 'center' });
    doc.fillColor('#000000');

    if (number) {
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`Nº ${number}`, 50, doc.y, { width: W, align: 'center' });
    }
    doc.moveDown(0.8);

    // ── Client info ─────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').text('CLIENTE:');
    doc.font('Helvetica').text(clientName || '—');
    if (clientAddress) doc.text(clientAddress);
    doc.moveDown(0.8);

    // ── Items table header ───────────────────────────────────
    doc.rect(50, doc.y, W, 18).fill('#1e40af');
    const tY = doc.y + 4;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Cantidad', 55,  tY, { width: 60 });
    doc.text('Descripción', 120, tY, { width: W - 180 });
    doc.text('Precio unit.', 50 + W - 120, tY, { width: 60, align: 'right' });
    doc.text('Subtotal',     50 + W - 55,  tY, { width: 55, align: 'right' });
    doc.fillColor('#000000');
    doc.moveDown(1.2);

    // ── Items rows ───────────────────────────────────────────
    let total = 0;
    items.forEach((item, i) => {
      const qty      = parseInt(item.qty || 1);
      const price    = parseFloat(item.price || item.unit_price || 0);
      const subtotal = qty * price;
      total += subtotal;

      if (i % 2 === 0) {
        doc.rect(50, doc.y - 2, W, 16).fill('#f8fafc');
        doc.fillColor('#000000');
      }

      const rowY = doc.y;
      doc.fontSize(9).font('Helvetica');
      doc.text(String(qty),                 55,  rowY, { width: 60 });
      doc.text(item.name || item.product_name || '—', 120, rowY, { width: W - 180 });
      doc.text(price > 0 ? `$${price.toFixed(2)}` : '—', 50 + W - 120, rowY, { width: 60, align: 'right' });
      doc.text(subtotal > 0 ? `$${subtotal.toFixed(2)}` : '—', 50 + W - 55, rowY, { width: 55, align: 'right' });
      doc.moveDown(0.9);
    });

    // ── Total ────────────────────────────────────────────────
    doc.moveDown(0.3);
    doc.rect(50 + W - 200, doc.y - 2, 200, 18).fill('#f1f5f9');
    doc.fillColor('#000000');
    const totY = doc.y + 2;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('TOTAL:', 50 + W - 200, totY, { width: 140, align: 'right' });
    doc.text(`$${total.toFixed(2)}`, 50 + W - 55, totY, { width: 55, align: 'right' });
    doc.moveDown(2);

    // ── Notes ────────────────────────────────────────────────
    if (notes) {
      doc.fontSize(9).font('Helvetica-Bold').text('Observaciones:');
      doc.font('Helvetica').text(notes);
      doc.moveDown(1);
    }

    // ── Signature area ───────────────────────────────────────
    doc.moveDown(1);
    const sigY = doc.y;
    doc.moveTo(50, sigY + 30).lineTo(220, sigY + 30).stroke();
    doc.moveTo(W - 120, sigY + 30).lineTo(W + 50, sigY + 30).stroke();
    doc.fontSize(8).font('Helvetica')
      .text('Firma y aclaración emisor', 50, sigY + 34, { width: 170 })
      .text('Firma y aclaración receptor', W - 120, sigY + 34, { width: 170 });

    if (createdBy) {
      doc.fontSize(8).text(`Emitido por: ${createdBy}`, 50, sigY + 52);
    }

    doc.end();
  });
}

module.exports = { generateRemitoPDF };
