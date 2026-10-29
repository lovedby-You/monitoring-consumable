const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReport } = require('../src/modules/monitoring/report');
const { toCsv } = require('../src/modules/monitoring/exporters/csv');
const { toXlsx } = require('../src/modules/monitoring/exporters/xlsx');
const { toPdf } = require('../src/modules/monitoring/exporters/pdf');
const ExcelJS = require('exceljs');

// Fixture meniru baris BHXS pada file acuan (carry over 8260, harga 2.293)
const items = [
  {
    id: 1,
    code: 'BHXS',
    name: 'BOX HALF XS (300*300*150)',
    unit: 'PCS',
    initialStock: 8260,
    unitCost: 2293,
    isActive: true,
  },
  {
    id: 2,
    code: 'BS',
    name: 'BOX S',
    unit: 'PCS',
    initialStock: 100,
    unitCost: 1000,
    isActive: true,
  },
  {
    id: 3,
    code: 'OLD',
    name: 'Item lama; "nonaktif"',
    unit: 'ROLL',
    initialStock: 5,
    unitCost: 0,
    isActive: false,
  },
];
const out = (id, day, qty) => ({
  consumableId: id,
  date: `2026-08-${String(day).padStart(2, '0')}`,
  type: 'OUT',
  qty,
});
const movements = [
  out(1, 4, 1260),
  out(1, 7, 600),
  out(1, 12, 1440),
  out(1, 20, 1320),
  out(1, 28, 840),
  { consumableId: 2, date: '2026-08-10', type: 'IN', qty: 50 },
];
const before = new Map([[2, { totalIn: 20, totalOut: 30 }]]); // carry BS = 100 + 20 - 30 = 90

const make = () =>
  buildReport({ month: '2026-08', items, before, movements, leadTimeDays: 8, coverDays: 75 });

test('buildReport: carry over, total, left over, avg (dibagi hari dalam bulan)', () => {
  const r = make();
  assert.equal(r.label, '1-31 August 2026');
  assert.equal(r.dayLabels.length, 31);
  assert.equal(r.rows.length, 2); // item nonaktif tanpa transaksi disembunyikan
  const a = r.rows[0];
  assert.equal(a.carryOver, 8260);
  assert.equal(a.totalOut, 5460);
  assert.equal(a.leftOver, 2800);
  assert.equal(a.averageUsage, 176.13); // 5460 / 31
  assert.equal(a.maxQty, 1440);
  assert.equal(a.minQty, 0);
  assert.equal(a.initialAmount, 8260 * 2293);
  assert.equal(a.finalAmountUsed, 5460 * 2293);
  assert.equal(a.orderAlert, false);
  const b = r.rows[1];
  assert.equal(b.carryOver, 90);
  assert.equal(b.leftOver, 140);
  assert.equal(r.totals.initialAmount, 8260 * 2293 + 90 * 1000);
});

test('item nonaktif tampil bila ada transaksi di bulan itu', () => {
  const r = buildReport({
    month: '2026-08',
    items,
    before,
    movements: [...movements, out(3, 2, 1)],
    leadTimeDays: 8,
    coverDays: 75,
  });
  assert.equal(r.rows.length, 3);
});

test('CSV: jumlah kolom konsisten & format Indonesia', () => {
  const csv = toCsv(make());
  const lines = csv.replace('\uFEFF', '').trim().split('\r\n');
  assert.equal(lines[0], 'Consumable report');
  assert.equal(lines[1], 'Periode 1-31 August 2026');
  const head = lines[2].split(';');
  assert.equal(head.length, 8 + 31 * 2 + 12);
  assert.equal(head[head.length - 1], 'Quantity to be Ordered for 3 month');
  const row = lines[5].split(';');
  assert.equal(row.length, head.length);
  assert.equal(row[2], 'BHXS');
  assert.equal(row[6], 'IDR 18.940.180');
  assert.ok(csv.includes('"Item lama; ""nonaktif"""') === false); // item nonaktif tidak ada di fixture ini
  assert.ok(lines[lines.length - 1].includes('TOTAL Amount'));
});

test('XLSX: bisa dibaca kembali & nilai sesuai', async () => {
  const buf = await toXlsx(make());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('Monitoring');
  assert.equal(ws.getCell('A1').value, 'Consumable report');
  assert.equal(ws.getCell('C5').value, 'BHXS');
  assert.equal(ws.getCell('E5').value, 8260);
  const alert = ws.getRow(5).getCell(8 + 62 + 11).value;
  assert.equal(alert, 'Safe');
});

test('PDF: menghasilkan dokumen PDF valid', async () => {
  const buf = await toPdf(make());
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(buf.length > 2000);
});
