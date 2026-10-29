// Uji API end-to-end (Express + service nyata) memakai Prisma tiruan di memori.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mysql://x:y@localhost:3306/test';
process.env.JWT_SECRET = 'test-secret-test-secret-1234';

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { makeFakePrisma } = require('./helpers/fake-prisma');

const fake = makeFakePrisma();
const prismaPath = require.resolve('../src/lib/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fake };

const app = require('../src/app');
const { todayStr, addDays } = require('../src/utils/dates');

let server;
let base;
const today = todayStr('Asia/Jakarta');

async function call(method, path, body, cookie) {
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, res };
}
async function login(username, password) {
  const r = await call('POST', '/auth/login', { username, password });
  return { ...r, cookie: (r.res.headers.get('set-cookie') || '').split(';')[0] };
}

let admin;
let staff;
let item; // consumable A
const ids = {};

test.before(async () => {
  await fake.user.create({
    data: {
      username: 'admin',
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: bcrypt.hashSync('Admin#1', 4),
    },
  });
  await fake.user.create({
    data: {
      username: 'staff',
      name: 'Staff',
      role: 'USER',
      passwordHash: bcrypt.hashSync('Staff#1', 4),
    },
  });
  await new Promise((r) => {
    server = app.listen(0, r);
  });
  base = `http://127.0.0.1:${server.address().port}`;
  admin = (await login('admin', 'Admin#1')).cookie;
  staff = (await login('staff', 'Staff#1')).cookie;
});
test.after(() => server.close());

test('login: password salah ditolak, benar mengeset cookie httpOnly', async () => {
  assert.equal(
    (await call('POST', '/auth/login', { username: 'admin', password: 'salah' })).status,
    401,
  );
  const r = await login('admin', 'Admin#1');
  assert.equal(r.status, 200);
  assert.match(r.res.headers.get('set-cookie'), /HttpOnly/i);
  assert.equal((await call('GET', '/auth/me', null, admin)).data.user.role, 'ADMIN');
  assert.equal((await call('GET', '/auth/me')).status, 401);
});

test('RBAC: user biasa hanya Dashboard + Stock IN/OUT', async () => {
  assert.equal((await call('GET', '/monitoring', null, staff)).status, 403);
  assert.equal((await call('GET', '/daily-orders', null, staff)).status, 403);
  assert.equal(
    (await call('POST', '/consumables', { code: 'X', name: 'X', unit: 'PCS' }, staff)).status,
    403,
  );
  assert.equal((await call('GET', '/dashboard', null, staff)).status, 200);
  assert.equal((await call('GET', '/stock-in', null, staff)).status, 200);
  assert.equal((await call('GET', '/stock-out', null, staff)).status, 200);
});

test('master consumable: 5 field, unit hanya PCS/ROLL, kode unik', async () => {
  const a = await call(
    'POST',
    '/consumables',
    { code: 'BX', name: 'Box', unit: 'PCS', initialStock: 100, unitCost: 2500 },
    admin,
  );
  assert.equal(a.status, 201);
  item = a.data;
  const b = await call(
    'POST',
    '/consumables',
    { code: 'TP', name: 'Tape', unit: 'ROLL', initialStock: 10, unitCost: 9000 },
    admin,
  );
  ids.tape = b.data.id;
  assert.equal(
    (await call('POST', '/consumables', { code: 'BX', name: 'Dup', unit: 'PCS' }, admin)).status,
    409,
  );
  assert.equal(
    (await call('POST', '/consumables', { code: 'Z', name: 'Z', unit: 'KG' }, admin)).status,
    400,
  );
  const list = await call('GET', '/consumables?all=true', null, staff);
  assert.equal(list.data.data.find((c) => c.code === 'BX').stock, 100);
});

test('Stock IN: wajib no PO, stok bertambah, tampil di daftar', async () => {
  const bad = await call(
    'POST',
    '/stock-in',
    { date: today, name: 'Supplier', consumableId: item.id, qty: 50 },
    staff,
  );
  assert.equal(bad.status, 400);
  const ok = await call(
    'POST',
    '/stock-in',
    { date: today, name: 'Supplier A', poNumber: 'PO-001', consumableId: item.id, qty: 50 },
    staff,
  );
  assert.equal(ok.status, 201);
  assert.equal(ok.data.stockAfter, 150);
  assert.equal(ok.data.poNumber, 'PO-001');
  const list = await call('GET', '/stock-in?q=po-001', null, staff);
  assert.equal(list.data.total, 1);
  assert.equal(list.data.data[0].date, today);
  assert.equal(list.data.data[0].consumable.code, 'BX');
  ids.in1 = ok.data.id;
});

test('Stock OUT: tanpa no PO, stok tidak boleh negatif', async () => {
  const over = await call(
    'POST',
    '/stock-out',
    { date: today, name: 'Tim A', consumableId: item.id, qty: 151 },
    staff,
  );
  assert.equal(over.status, 422);
  assert.match(over.data.message, /Stok tidak cukup/);
  const ok = await call(
    'POST',
    '/stock-out',
    { date: today, name: 'Tim A', consumableId: item.id, qty: 30 },
    staff,
  );
  assert.equal(ok.status, 201);
  assert.equal(ok.data.stockAfter, 120);
  assert.equal('poNumber' in ok.data, false);
  ids.out1 = ok.data.id;
  assert.equal(
    (
      await call(
        'POST',
        '/stock-out',
        { date: 'bukan-tanggal', name: 'x', consumableId: item.id, qty: 1 },
        staff,
      )
    ).status,
    400,
  );
});

test('hapus: user biasa dilarang; hapus penerimaan yang membuat stok negatif ditolak', async () => {
  assert.equal((await call('DELETE', `/stock-in/${ids.in1}`, null, staff)).status, 403);
  // stok 120 = 100 awal + 50 IN - 30 OUT; hapus IN 50 -> 70 (aman). Tambah OUT besar dulu agar jadi negatif.
  await call(
    'POST',
    '/stock-out',
    { date: today, name: 'Tim B', consumableId: item.id, qty: 100 },
    staff,
  ); // stok 20
  const blocked = await call('DELETE', `/stock-in/${ids.in1}`, null, admin);
  assert.equal(blocked.status, 422);
  assert.equal((await call('DELETE', `/stock-out/${ids.out1}`, null, admin)).status, 204); // stok 50
  assert.equal((await call('DELETE', `/stock-in/${ids.in1}`, null, admin)).status, 204); // stok 0 -> boleh
  const stock = (await call('GET', '/consumables?all=true', null, admin)).data.data.find(
    (c) => c.code === 'BX',
  ).stock;
  assert.equal(stock, 0); // 100 awal - 100 OUT (penerimaan sudah dihapus)
});

test('consumable yang sudah punya transaksi tidak bisa dihapus', async () => {
  const r = await call('DELETE', `/consumables/${item.id}`, null, admin);
  assert.equal(r.status, 409);
  assert.equal((await call('DELETE', `/consumables/${ids.tape}`, null, admin)).status, 204);
});

test('Order hari ini: upsert per tanggal, admin saja', async () => {
  assert.equal(
    (await call('PUT', '/daily-orders', { date: today, totalOrders: 100 }, admin)).status,
    200,
  );
  const again = await call('PUT', '/daily-orders', { date: today, totalOrders: 120 }, admin);
  assert.equal(again.data.totalOrders, 120);
  const list = await call('GET', '/daily-orders', null, admin);
  assert.equal(list.data.total, 1);
  assert.equal(
    (await call('PUT', '/daily-orders', { date: today, totalOrders: -1 }, admin)).status,
    400,
  );
});

test('Dashboard: IN/OUT hari ini, order hari ini, usage per order, grafik 14 hari', async () => {
  await call(
    'POST',
    '/stock-in',
    { date: today, name: 'Supplier', poNumber: 'PO-9', consumableId: item.id, qty: 200 },
    admin,
  );
  await call(
    'POST',
    '/stock-out',
    { date: addDays(today, -1), name: 'Kemarin', consumableId: item.id, qty: 10 },
    admin,
  );
  const d = (await call('GET', '/dashboard', null, staff)).data;
  assert.equal(d.date, today);
  assert.equal(d.summary.ordersToday, 120);
  assert.equal(d.summary.totalInToday, 200);
  assert.equal(d.summary.totalOutToday, 100); // OUT 100 (Tim B) hari ini
  assert.equal(d.summary.usagePerOrderTotal, 0.83);
  assert.equal(d.chart.length, 14);
  assert.equal(d.chart.at(-1).orders, 120);
  assert.equal(d.chart.at(-1).totalUsage, 100);
  const row = d.perItem.find((r) => r.code === 'BX');
  assert.equal(row.stock, 190); // 100 awal + 200 IN - 110 OUT
  assert.equal(d.summary.inventoryValue, 190 * 2500);
});

test('Monitoring: rumus Left over, Avg usage, Order point, alert (admin saja)', async () => {
  const r = await call('GET', '/monitoring?days=30&leadTime=8&coverDays=75', null, admin);
  assert.equal(r.status, 200);
  const row = r.data.data.find((x) => x.code === 'BX');
  assert.equal(row.totalIn, 200);
  assert.equal(row.totalOut, 110);
  assert.equal(row.leftOver, 190);
  assert.equal(row.carryOver, 100);
  assert.equal(row.averageUsage, 3.67); // 110 / 30
  assert.equal(row.orderPoint, 29.33);
  assert.equal(row.safetyStock, 29);
  assert.equal(row.orderAlert, false);
  assert.equal(row.quantityToOrder, 275); // 110 * 75 / 30
  assert.equal(row.maxQty, 200);
});

test('Export laporan bulanan: CSV, Excel, PDF', async () => {
  const month = today.slice(0, 7);
  const csv = await call('GET', `/monitoring/export?month=${month}&format=csv`, null, admin);
  assert.match(csv.res.headers.get('content-type'), /text\/csv/);
  assert.match(
    csv.res.headers.get('content-disposition'),
    new RegExp(`consumable-report-${month}\\.csv`),
  );
  assert.ok(csv.data.toString('utf8').includes('BX'));
  const xlsx = await call('GET', `/monitoring/export?month=${month}&format=xlsx`, null, admin);
  assert.equal(xlsx.data.subarray(0, 2).toString(), 'PK');
  const pdf = await call('GET', `/monitoring/export?month=${month}&format=pdf`, null, admin);
  assert.equal(pdf.data.subarray(0, 5).toString(), '%PDF-');
  assert.equal(
    (await call('GET', `/monitoring/export?month=${month}&format=csv`, null, staff)).status,
    403,
  );
  assert.equal(
    (await call('GET', '/monitoring/export?month=2026-13&format=csv', null, admin)).status,
    400,
  );
});

test('rute lama sudah tidak ada', async () => {
  assert.equal((await call('GET', '/movements', null, admin)).status, 404);
  assert.equal((await call('GET', '/marketplace-orders', null, admin)).status, 404);
});
