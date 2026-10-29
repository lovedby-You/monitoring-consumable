// Uji penyajian frontend (hasil build) dari server backend
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
fs.mkdirSync(path.join(dist, 'assets'));
fs.writeFileSync(
  path.join(dist, 'index.html'),
  '<!doctype html><title>WMS</title><div id="root"></div>',
);
fs.writeFileSync(path.join(dist, 'assets', 'app.js'), 'console.log("ok")');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mysql://x:y@localhost:3306/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.FRONTEND_DIST = dist;

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeFakePrisma } = require('./helpers/fake-prisma');

const prismaPath = require.resolve('../src/lib/prisma');
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: makeFakePrisma(),
};
const app = require('../src/app');

let server;
let base;
test.before(async () => {
  await new Promise((r) => {
    server = app.listen(0, r);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('halaman utama dan rute React (SPA) mengembalikan index.html', async () => {
  for (const p of ['/', '/penerimaan', '/order-hari-ini', '/login']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
    assert.match(await r.text(), /id="root"/, p);
  }
});

test('file aset disajikan apa adanya', async () => {
  const r = await fetch(`${base}/assets/app.js`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /javascript/);
});

test('rute /api tetap JSON, tidak jatuh ke index.html', async () => {
  const health = await fetch(`${base}/api/health`);
  assert.equal((await health.json()).status, 'ok');
  const missing = await fetch(`${base}/api/v1/tidak-ada`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /json/);
  const bare = await fetch(`${base}/api`);
  assert.equal(bare.status, 404);
});

test('CSP aktif tanpa upgrade-insecure-requests (agar bisa dibuka lewat http://localhost)', async () => {
  const csp = (await fetch(base)).headers.get('content-security-policy');
  assert.match(csp, /default-src 'self'/);
  assert.equal(csp.includes('upgrade-insecure-requests'), false);
});
