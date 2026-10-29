const test = require('node:test');
const assert = require('node:assert/strict');
const { stockInSchema, stockOutSchema } = require('../src/modules/stock/stock.schema');

const base = { date: '2026-10-01', name: 'Supplier A', consumableId: 1, qty: 10 };

test('StockIn: wajib punya no PO', () => {
  assert.equal(stockInSchema.safeParse(base).success, false);
  assert.equal(stockInSchema.safeParse({ ...base, poNumber: '  ' }).success, false);
  const ok = stockInSchema.safeParse({ ...base, poNumber: 'PO-1', qty: '25', consumableId: '3' });
  assert.equal(ok.success, true);
  assert.equal(ok.data.qty, 25);
});

test('StockOut: tanpa no PO, field PO diabaikan', () => {
  const r = stockOutSchema.safeParse({ ...base, poNumber: 'PO-1' });
  assert.equal(r.success, true);
  assert.equal('poNumber' in r.data, false);
});

test('qty harus bilangan bulat > 0, tanggal valid, nama wajib', () => {
  for (const bad of [
    { qty: 0 },
    { qty: -1 },
    { qty: 1.5 },
    { date: '2026-02-30' },
    { date: '01/10/2026' },
    { name: ' ' },
    { consumableId: 0 },
  ]) {
    assert.equal(stockOutSchema.safeParse({ ...base, ...bad }).success, false, JSON.stringify(bad));
  }
});
