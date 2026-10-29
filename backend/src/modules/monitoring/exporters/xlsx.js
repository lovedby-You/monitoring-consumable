const ExcelJS = require('exceljs');
const { alertText, unitText, qtyHeader } = require('./format');

const NAVY = 'FF0A2F6B';
const SKY = 'FFE8F0FC';
const thin = { style: 'thin', color: { argb: 'FFC9D6EE' } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const INT = '#,##0';
const DEC = '#,##0.00';
const DAY = '#,##0;-#,##0;"-"';
const IDR = '"IDR" #,##0';

async function toXlsx(rep) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Consumable WMS';
  const ws = wb.addWorksheet('Monitoring', { views: [{ state: 'frozen', xSplit: 3, ySplit: 4 }] });
  const nDay = rep.daysInMonth * 2;
  const dayStart = 9; // kolom I
  const tail = dayStart + nDay; // kolom pertama setelah kolom harian (Total In)
  const lastCol = tail + 11;

  ws.getCell('A1').value = 'Consumable report';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: NAVY } };
  ws.getCell('A2').value = `Periode ${rep.label}`;
  ws.getCell('A2').font = { italic: true };

  // ---- header (baris 3-4) ----
  const fixed = [
    'No',
    'Item name',
    'SKU / Code',
    'Unit',
    'Carry Over',
    'Price',
    'Initial Amount',
    'Final Amount used',
  ];
  fixed.forEach((t, i) => {
    ws.getCell(3, i + 1).value = t;
    ws.mergeCells(3, i + 1, 4, i + 1);
  });
  rep.dayLabels.forEach((l, i) => {
    const c = dayStart + i * 2;
    ws.getCell(3, c).value = l;
    ws.mergeCells(3, c, 3, c + 1);
    ws.getCell(4, c).value = 'In';
    ws.getCell(4, c + 1).value = 'Out';
  });
  const tailHead = [
    'Total In',
    'Total Out',
    'Left over',
    'Avg. usage',
    'Max. Qty in/out',
    'Min. Qty in/out',
    'AWU',
    'Order Point',
    'LT order',
    'Mathematical safety stock',
    'Order Alert',
    qtyHeader(rep),
  ];
  tailHead.forEach((t, i) => {
    ws.getCell(3, tail + i).value = t;
    ws.mergeCells(3, tail + i, 4, tail + i);
  });
  for (let r = 3; r <= 4; r++) {
    for (let c = 1; c <= lastCol; c++) {
      const x = ws.getCell(r, c);
      x.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      x.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      x.border = border;
    }
  }
  ws.getRow(3).height = 30;

  // ---- data ----
  let rowNo = 5;
  for (const r of rep.rows) {
    const vals = [
      r.no,
      r.name,
      r.code,
      unitText(r),
      r.carryOver,
      r.price,
      r.initialAmount,
      r.finalAmountUsed,
    ];
    r.daily.in.forEach((v, i) => vals.push(v, r.daily.out[i]));
    vals.push(
      r.carryOver + r.totalIn,
      r.totalOut,
      r.leftOver,
      r.averageUsage,
      r.maxQty,
      r.minQty,
      r.awu,
      r.orderPoint,
      r.leadTimeDays,
      r.safetyStock,
      alertText(r),
      r.quantityToOrder,
    );
    const row = ws.getRow(rowNo++);
    vals.forEach((v, i) => {
      row.getCell(i + 1).value = v;
    });
    for (let c = 1; c <= lastCol; c++) {
      const x = row.getCell(c);
      x.border = border;
      if (c >= dayStart && c < tail) {
        x.numFmt = DAY;
        x.alignment = { horizontal: 'right' };
      }
    }
    [5, 6].forEach((c) => (row.getCell(c).numFmt = INT));
    [7, 8].forEach((c) => (row.getCell(c).numFmt = IDR));
    [0, 1, 2, 4, 5, 8, 9, 11].forEach((o) => (row.getCell(tail + o).numFmt = INT));
    [3, 6, 7].forEach((o) => (row.getCell(tail + o).numFmt = DEC));
    const a = row.getCell(tail + 10);
    a.alignment = { horizontal: 'center' };
    a.font = { bold: true, color: { argb: r.orderAlert ? 'FF7A5200' : 'FF1B6B3A' } };
    a.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: r.orderAlert ? 'FFFFE9A8' : 'FFDDF3E4' },
    };
    row.getCell(tail + 2).font = { bold: true };
  }

  // ---- total ----
  const t = ws.getRow(rowNo + 1);
  t.getCell(2).value = 'TOTAL Amount';
  t.getCell(7).value = rep.totals.initialAmount;
  t.getCell(8).value = rep.totals.finalAmountUsed;
  [7, 8].forEach((c) => (t.getCell(c).numFmt = IDR));
  for (let c = 1; c <= 8; c++) {
    t.getCell(c).font = { bold: true, color: { argb: NAVY } };
    t.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SKY } };
    t.getCell(c).border = border;
  }

  // ---- lebar kolom ----
  [5, 34, 12, 7, 11, 10, 17, 17].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  for (let c = dayStart; c < tail; c++) ws.getColumn(c).width = 6.5;
  [10, 10, 10, 11, 13, 13, 10, 12, 9, 16, 13, 18].forEach(
    (w, i) => (ws.getColumn(tail + i).width = w),
  );

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 8,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
module.exports = { toXlsx };
