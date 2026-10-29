const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../src/utils/calculations');
const d = require('../src/utils/dates');

const P = { periodDays: 30, leadTimeDays: 8, coverDays: 75 };
const item = (code) => ({ id: 1, code, name: code, unit: 'PCS' });

// Nilai kasus di bawah diambil dari baris nyata file "Monitoring of consumables inventory (Aug 26)"
test('BHXS: carry 8260, out 5460 (periode 30 hari)', () => {
  const r = c.buildMonitoringRow(
    item('BHXS'),
    { carryOver: 8260, totalIn: 0, totalOut: 5460, maxQty: 1440, minQty: 0 },
    P,
  );
  assert.equal(r.leftOver, 2800);
  assert.equal(r.averageUsage, 182);
  assert.equal(r.awu, 1274);
  assert.equal(r.orderPoint, 1456);
  assert.equal(r.safetyStock, 1456);
  assert.equal(r.orderAlert, false); // 2800 > 1456 -> Safe
  assert.equal(r.quantityToOrder, 13650);
});

test('BHS: stok di bawah order point -> Need order', () => {
  const r = c.buildMonitoringRow(
    item('BHS'),
    { carryOver: 4522, totalIn: 0, totalOut: 4320, maxQty: 800, minQty: 0 },
    P,
  );
  assert.equal(r.leftOver, 202);
  assert.equal(r.averageUsage, 144);
  assert.equal(r.orderPoint, 1152);
  assert.equal(r.orderAlert, true);
  assert.equal(r.quantityToOrder, 10800);
});

test('BHM: avg 29,33; order point 234,67; safety stock dibulatkan 235', () => {
  const r = c.buildMonitoringRow(
    item('BHM'),
    { carryOver: 1960, totalIn: 0, totalOut: 880, maxQty: 400, minQty: 0 },
    P,
  );
  assert.equal(r.averageUsage, 29.33);
  assert.equal(r.awu, 205.33);
  assert.equal(r.orderPoint, 234.67);
  assert.equal(r.safetyStock, 235);
  assert.equal(r.quantityToOrder, 2200);
});

test('PW: safety stock = ROUND(order point) -> 13,33 jadi 13', () => {
  const r = c.buildMonitoringRow(
    item('PW'),
    { carryOver: 880, totalIn: 0, totalOut: 50, maxQty: 7, minQty: 0 },
    P,
  );
  assert.equal(r.safetyStock, 13);
  assert.equal(r.quantityToOrder, 125);
});

test('SF: qty to order membulatkan .5 ke atas (2,5 -> 3); stok 0 -> Need order', () => {
  const r = c.buildMonitoringRow(
    item('SF'),
    { carryOver: 1, totalIn: 0, totalOut: 1, maxQty: 1, minQty: 0 },
    P,
  );
  assert.equal(r.leftOver, 0);
  assert.equal(r.quantityToOrder, 3);
  assert.equal(r.orderAlert, true);
});

test('BAUTO: 14062,5 dibulatkan 14063', () =>
  assert.equal(c.calcQuantityToOrder(5625, 75, 30), 14063));

test('BW: ada IN di periode, left over = carry + IN - OUT', () => {
  const r = c.buildMonitoringRow(
    item('BW'),
    { carryOver: 1044, totalIn: 250, totalOut: 391, maxQty: 100, minQty: 0 },
    P,
  );
  assert.equal(r.leftOver, 903);
  assert.equal(r.averageUsage, 13.03);
  assert.equal(r.quantityToOrder, 978);
});

test('lead time & cover days bisa diubah', () => {
  const r = c.buildMonitoringRow(
    item('X'),
    { carryOver: 100, totalIn: 0, totalOut: 300, maxQty: 50, minQty: 0 },
    { periodDays: 30, leadTimeDays: 5, coverDays: 30 },
  );
  assert.equal(r.averageUsage, 10);
  assert.equal(r.orderPoint, 50);
  assert.equal(r.quantityToOrder, 300);
});

test('tanpa pemakaian: avg 0, order point 0, alert hanya bila stok 0', () => {
  assert.equal(
    c.buildMonitoringRow(
      item('Z'),
      { carryOver: 5, totalIn: 0, totalOut: 0, maxQty: 0, minQty: 0 },
      P,
    ).orderAlert,
    false,
  );
  assert.equal(
    c.buildMonitoringRow(
      item('Z'),
      { carryOver: 0, totalIn: 0, totalOut: 0, maxQty: 0, minQty: 0 },
      P,
    ).orderAlert,
    true,
  );
  assert.equal(c.calcAverageUsage(10, 0), 0);
});

test('util tanggal', () => {
  assert.equal(d.addDays('2025-03-01', -1), '2025-02-28');
  assert.equal(d.isValidDateStr('2025-02-30'), false);
  assert.equal(d.rangeDays('2025-01-30', '2025-02-01').length, 3);
  assert.equal(d.monthRange('2028-02').days, 29);
  assert.equal(d.monthRange('2026-08').to, '2026-08-31');
  assert.equal(d.todayStr('Asia/Jakarta', new Date('2025-01-01T20:00:00Z')), '2025-01-02');
});
