const PDFDocument = require('pdfkit');
const { group, dec2, alertText, unitText } = require('./format');

const NAVY = '#0a2f6b';
const SKY = '#eef3fb';
const WARN = '#fff1c2';

/** Gambar tabel dengan header berulang di setiap halaman. cols: [{w, align}] ; rows: [{cells, fill, bold}] */
function drawTable(doc, { cols, header, rows, rowH = 12, headH = 24, font = 6.5, y }) {
  const left = doc.page.margins.left;
  const width = cols.reduce((a, c) => a + c.w, 0);
  const bottom = doc.page.height - doc.page.margins.bottom - 16;
  const head = () => {
    doc.rect(left, y, width, headH).fill(NAVY);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(font);
    let x = left;
    cols.forEach((c, i) => {
      doc.text(header[i], x + 2, y + 3, {
        width: c.w - 4,
        height: headH - 4,
        align: c.align === 'right' ? 'center' : c.align || 'left',
      });
      x += c.w;
    });
    y += headH;
  };
  head();
  rows.forEach((row, ri) => {
    if (y + rowH > bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      head();
    }
    const fill = row.fill || (ri % 2 ? SKY : null);
    if (fill) doc.rect(left, y, width, rowH).fill(fill);
    doc
      .fillColor('#1b2a41')
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(font);
    let x = left;
    cols.forEach((c, i) => {
      doc.text(String(row.cells[i] ?? ''), x + 2, y + 2.5, {
        width: c.w - 4,
        height: rowH - 2,
        align: c.align || 'left',
        ellipsis: true,
        lineBreak: false,
      });
      x += c.w;
    });
    doc
      .moveTo(left, y + rowH)
      .lineTo(left + width, y + rowH)
      .lineWidth(0.3)
      .strokeColor('#c9d6ee')
      .stroke();
    y += rowH;
  });
  return y;
}

function toPdf(rep) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 20,
      bufferPages: true,
      info: { Title: `Consumable report ${rep.label}` },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ---- halaman 1: ringkasan ----
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(14).text('Consumable report', 20, 20);
    doc
      .fillColor('#444444')
      .font('Helvetica')
      .fontSize(8)
      .text(
        `Periode ${rep.label}  |  Lead time ${rep.leadTimeDays} hari  |  Qty to order = ${rep.coverLabel}  |  Nilai dalam IDR`,
        20,
        38,
      );
    const sumCols = [
      ['No', 18, 'right'],
      ['Item name', 106, 'left'],
      ['SKU / Code', 38, 'left'],
      ['Unit', 24, 'left'],
      ['Carry Over', 36, 'right'],
      ['Price', 34, 'right'],
      ['Initial Amount', 56, 'right'],
      ['Final Amount used', 56, 'right'],
      ['Total In', 34, 'right'],
      ['Total Out', 34, 'right'],
      ['Left over', 36, 'right'],
      ['Avg. usage', 34, 'right'],
      ['Max Qty', 30, 'right'],
      ['Min Qty', 26, 'right'],
      ['AWU', 36, 'right'],
      ['Order Point', 38, 'right'],
      ['LT', 18, 'right'],
      ['Safety stock', 34, 'right'],
      ['Order Alert', 42, 'center'],
      [`Qty to order\n(${rep.coverLabel})`, 42, 'right'],
    ];
    const summaryRows = rep.rows.map((r) => ({
      fill: r.orderAlert ? WARN : null,
      cells: [
        r.no,
        r.name,
        r.code,
        unitText(r),
        group(r.carryOver),
        group(r.price),
        group(r.initialAmount),
        group(r.finalAmountUsed),
        group(r.carryOver + r.totalIn),
        group(r.totalOut),
        group(r.leftOver),
        dec2(r.averageUsage),
        group(r.maxQty),
        group(r.minQty),
        dec2(r.awu),
        dec2(r.orderPoint),
        r.leadTimeDays,
        group(r.safetyStock),
        alertText(r),
        group(r.quantityToOrder),
      ],
    }));
    summaryRows.push({
      bold: true,
      fill: '#dfe9fa',
      cells: [
        '',
        'TOTAL Amount',
        '',
        '',
        '',
        '',
        group(rep.totals.initialAmount),
        group(rep.totals.finalAmountUsed),
      ],
    });
    const yEnd = drawTable(doc, {
      cols: sumCols.map(([, w, align]) => ({ w, align })),
      header: sumCols.map((c) => c[0]),
      rows: summaryRows,
      y: 54,
      headH: 26,
    });
    doc
      .fillColor('#555555')
      .font('Helvetica')
      .fontSize(6.5)
      .text(
        'Total In sudah termasuk carry over. Left over = Total In - Total Out. Avg usage = Total Out / jumlah hari bulan. AWU = avg x 7. Order Point = avg x lead time. Safety stock = pembulatan order point. Need order bila left over <= order point.',
        20,
        Math.min(yEnd + 6, doc.page.height - 40),
        { width: 802 },
      );

    // ---- halaman berikutnya: pergerakan harian ----
    doc.addPage();
    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`Pergerakan harian (In / Out) - ${rep.label}`, 20, 20);
    const nd = rep.daysInMonth;
    const dayW = 20;
    const totalW = 34;
    const typeW = 22;
    const itemW = 802 - typeW - totalW - nd * dayW;
    const dCols = [
      { w: itemW, align: 'left' },
      { w: typeW, align: 'left' },
      ...Array.from({ length: nd }, () => ({ w: dayW, align: 'right' })),
      { w: totalW, align: 'right' },
    ];
    const dHeader = ['Item', 'Tipe', ...rep.dayLabels.map((l) => l.split('-')[0]), 'Total'];
    const dRows = [];
    rep.rows.forEach((r) => {
      const z = (v) => (v ? group(v) : '');
      dRows.push({
        fill: SKY,
        cells: [`${r.code} - ${r.name}`, 'IN', ...r.daily.in.map(z), group(r.totalIn)],
      });
      dRows.push({ cells: ['', 'OUT', ...r.daily.out.map(z), group(r.totalOut)] });
    });
    drawTable(doc, {
      cols: dCols,
      header: dHeader,
      rows: dRows,
      y: 40,
      rowH: 11,
      headH: 16,
      font: 6,
    });

    // ---- nomor halaman ----
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      doc
        .fillColor('#888888')
        .font('Helvetica')
        .fontSize(7)
        .text(`Halaman ${i + 1} dari ${range.count}`, 20, doc.page.height - 18, {
          width: 802,
          align: 'right',
          lineBreak: false,
        });
    }
    doc.end();
  });
}
module.exports = { toPdf };
