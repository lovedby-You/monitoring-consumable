// Uji keamanan & bug. Menggunakan Prisma tiruan; uji konkurensi stok dilakukan terpisah pada MariaDB asli.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mysql://x:y@localhost:3306/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { makeFakePrisma } = require('./helpers/fake-prisma');

const fake = makeFakePrisma();
const prismaPath = require.resolve('../src/lib/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fake };

const app = require('../src/app');
const { todayStr, addDays } = require('../src/utils/dates');

const today = todayStr('Asia/Jakarta');
let server;
let base;
let admin;
let staff;
let item;

async function call(method, url, { body, cookie, headers = {}, raw } = {}) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: {
      ...(body && !raw ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, res };
}
const api = (m, p, o) => call(m, `/api/v1${p}`, o);
async function login(username, password, headers) {
  const r = await api('POST', '/auth/login', { body: { username, password }, headers });
  return { ...r, cookie: (r.res.headers.get('set-cookie') || '').split(';')[0] };
}

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
  item = (
    await api('POST', '/consumables', {
      cookie: admin,
      body: { code: 'BX', name: 'Box', unit: 'PCS', initialStock: 100, unitCost: 1000 },
    })
  ).data;
});
test.after(() => server.close());

// ---------- Autentikasi & otorisasi ----------
const PROTECTED = [
  ['GET', '/auth/me'],
  ['GET', '/dashboard'],
  ['GET', '/consumables'],
  ['POST', '/consumables'],
  ['PUT', '/consumables/1'],
  ['DELETE', '/consumables/1'],
  ['GET', '/stock-in'],
  ['POST', '/stock-in'],
  ['DELETE', '/stock-in/1'],
  ['GET', '/stock-out'],
  ['POST', '/stock-out'],
  ['DELETE', '/stock-out/1'],
  ['GET', '/monitoring'],
  ['GET', '/monitoring/export?month=2026-01&format=csv'],
  ['GET', '/daily-orders'],
  ['PUT', '/daily-orders'],
  ['DELETE', '/daily-orders/1'],
];

test('semua endpoint terproteksi menolak permintaan tanpa login (401)', async () => {
  for (const [m, p] of PROTECTED)
    assert.equal(
      (await api(m, p, { body: m === 'GET' ? undefined : {} })).status,
      401,
      `${m} ${p}`,
    );
});

test('user biasa ditolak (403) di semua endpoint khusus admin', async () => {
  const adminOnly = [
    ['POST', '/consumables'],
    ['PUT', '/consumables/1'],
    ['DELETE', '/consumables/1'],
    ['DELETE', '/stock-in/1'],
    ['DELETE', '/stock-out/1'],
    ['GET', '/monitoring'],
    ['GET', '/monitoring/export?month=2026-01&format=csv'],
    ['GET', '/daily-orders'],
    ['PUT', '/daily-orders'],
    ['DELETE', '/daily-orders/1'],
  ];
  for (const [m, p] of adminOnly)
    assert.equal(
      (await api(m, p, { cookie: staff, body: m === 'GET' ? undefined : {} })).status,
      403,
      `${m} ${p}`,
    );
});

test('JWT palsu / kedaluwarsa / alg none / user nonaktif ditolak', async () => {
  const uid = (await api('GET', '/auth/me', { cookie: admin })).data.user.id;
  const secret = process.env.JWT_SECRET;
  const cookieOf = (t) => `wms_token=${t}`;
  assert.equal(
    (
      await api('GET', '/auth/me', {
        cookie: cookieOf(jwt.sign({ sub: uid, role: 'ADMIN' }, 'secret-salah-secret-salah-123')),
      })
    ).status,
    401,
    'secret salah',
  );
  assert.equal(
    (
      await api('GET', '/auth/me', {
        cookie: cookieOf(jwt.sign({ sub: uid }, secret, { expiresIn: -10 })),
      })
    ).status,
    401,
    'kedaluwarsa',
  );
  const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: uid, role: 'ADMIN' })).toString('base64url')}.`;
  assert.equal((await api('GET', '/auth/me', { cookie: cookieOf(none) })).status, 401, 'alg none');
  assert.equal(
    (await api('GET', '/auth/me', { cookie: cookieOf(jwt.sign({ sub: 9999 }, secret)) })).status,
    401,
    'user tidak ada',
  );
  assert.equal(
    (await api('GET', '/auth/me', { cookie: cookieOf('bukan.jwt.sama-sekali') })).status,
    401,
    'sampah',
  );
  // role di token diabaikan: staff tidak bisa menaikkan role lewat klaim token
  const staffId = (await api('GET', '/auth/me', { cookie: staff })).data.user.id;
  const forged = jwt.sign({ sub: staffId, role: 'ADMIN' }, secret);
  assert.equal(
    (await api('GET', '/monitoring', { cookie: cookieOf(forged) })).status,
    403,
    'eskalasi role',
  );
  // user dinonaktifkan -> token lama langsung tidak berlaku
  fake.__tables.user.find((u) => u.id === staffId).isActive = false;
  assert.equal((await api('GET', '/auth/me', { cookie: staff })).status, 401, 'user nonaktif');
  fake.__tables.user.find((u) => u.id === staffId).isActive = true;
});

test('JWT dengan algoritma selain HS256 ditolak (algoritma dikunci)', async () => {
  const uid = (await api('GET', '/auth/me', { cookie: admin })).data.user.id;
  const hs384 = jwt.sign({ sub: uid }, process.env.JWT_SECRET, { algorithm: 'HS384' });
  assert.equal((await api('GET', '/auth/me', { cookie: `wms_token=${hs384}` })).status, 401);
});

test('cookie login: HttpOnly + SameSite=Lax, token tidak ada di body', async () => {
  const r = await login('admin', 'Admin#1');
  const sc = r.res.headers.get('set-cookie');
  assert.match(sc, /HttpOnly/i);
  assert.match(sc, /SameSite=Lax/i);
  assert.equal(JSON.stringify(r.data).includes('eyJ'), false);
  assert.equal('passwordHash' in r.data.user, false);
});

test('pesan login sama untuk username salah dan password salah (anti user enumeration)', async () => {
  const a = await login('tidak-ada', 'x');
  const b = await login('admin', 'salah');
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.data.message, b.data.message);
});

// ---------- Header, CORS, body ----------
test('header keamanan (helmet) aktif dan tidak membocorkan Express', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.res.headers.get('x-powered-by'), null);
  assert.equal(r.res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(r.res.headers.get('x-frame-options'));
});

test('CORS: hanya origin yang diizinkan', async () => {
  const bad = await call('GET', '/api/health', { headers: { Origin: 'https://situs-jahat.com' } });
  assert.equal(bad.res.headers.get('access-control-allow-origin'), null);
  const ok = await call('GET', '/api/health', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(ok.res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(ok.res.headers.get('access-control-allow-credentials'), 'true');
});

test('body terlalu besar ditolak, JSON rusak = 400 (bukan 500), form lintas-situs tidak diproses', async () => {
  const big = await api('POST', '/stock-out', {
    cookie: admin,
    body: { name: 'x'.repeat(300_000) },
  });
  assert.equal(big.status, 413);
  const broken = await api('POST', '/stock-out', {
    cookie: admin,
    raw: '{"name": ',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(broken.status, 400);
  const csrf = await api('POST', '/stock-out', {
    cookie: admin,
    raw: `date=${today}&name=x&consumableId=${item.id}&qty=1`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  assert.equal(csrf.status, 400);
  const plain = await api('POST', '/stock-out', {
    cookie: admin,
    raw: JSON.stringify({ date: today, name: 'x', consumableId: item.id, qty: 1 }),
    headers: { 'Content-Type': 'text/plain' },
  });
  assert.equal(plain.status, 400);
});

// ---------- Injeksi & mass assignment ----------
test('payload SQL injection tidak menyebabkan error dan disimpan apa adanya', async () => {
  for (const q of ["' OR '1'='1", "'; DROP TABLE Consumable; --", '%', '_', '\\']) {
    const r = await api('GET', `/stock-in?q=${encodeURIComponent(q)}`, { cookie: admin });
    assert.equal(r.status, 200, q);
  }
  const evil = "Robert'); DROP TABLE StockOut;--";
  const created = await api('POST', '/stock-out', {
    cookie: admin,
    body: { date: today, name: evil, consumableId: item.id, qty: 1 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.name, evil);
  assert.equal((await api('GET', '/stock-out', { cookie: admin })).status, 200);
});

test('mass assignment: id / createdById dari klien diabaikan', async () => {
  const r = await api('POST', '/stock-in', {
    cookie: staff,
    body: {
      id: 777,
      createdById: 1,
      date: today,
      name: 'S',
      poNumber: 'PO',
      consumableId: item.id,
      qty: 1,
    },
  });
  assert.equal(r.status, 201);
  assert.notEqual(r.data.id, 777);
  const staffId = (await api('GET', '/auth/me', { cookie: staff })).data.user.id;
  assert.equal(fake.__tables.stockIn.find((x) => x.id === r.data.id).createdById, staffId);
});

test('id tidak valid / tidak ada: 400 dan 404, bukan 500', async () => {
  assert.equal((await api('DELETE', '/stock-in/abc', { cookie: admin })).status, 400);
  assert.equal((await api('DELETE', '/stock-in/99999', { cookie: admin })).status, 404);
  assert.equal((await api('DELETE', '/consumables/99999', { cookie: admin })).status, 404);
});

// ---------- Batas input (mencegah error 500 / data aneh) ----------
test('angka terlalu besar ditolak (400) agar tidak melewati batas INT database', async () => {
  const stock = (qty) =>
    api('POST', '/stock-in', {
      cookie: admin,
      body: { date: today, name: 'S', poNumber: 'PO', consumableId: item.id, qty },
    });
  assert.equal((await stock(9_999_999_999)).status, 400, 'qty');
  assert.equal(
    (
      await api('POST', '/consumables', {
        cookie: admin,
        body: { code: 'BIG', name: 'Big', unit: 'PCS', initialStock: 9_999_999_999 },
      })
    ).status,
    400,
    'initialStock',
  );
  assert.equal(
    (
      await api('PUT', '/daily-orders', {
        cookie: admin,
        body: { date: today, totalOrders: 9_999_999_999 },
      })
    ).status,
    400,
    'totalOrders',
  );
  assert.equal(
    (await api('GET', '/stock-in?page=999999999999', { cookie: admin })).status,
    400,
    'page',
  );
});

test('tanggal di luar rentang wajar / di masa depan ditolak', async () => {
  const post = (date) =>
    api('POST', '/stock-out', {
      cookie: admin,
      body: { date, name: 'x', consumableId: item.id, qty: 1 },
    });
  assert.equal((await post('0001-01-01')).status, 400, 'tahun 0001');
  assert.equal((await post('9999-12-31')).status, 400, 'tahun 9999');
  assert.equal((await post(addDays(today, 1))).status, 400, 'besok');
  assert.equal(
    (
      await api('PUT', '/daily-orders', {
        cookie: admin,
        body: { date: addDays(today, 3), totalOrders: 1 },
      })
    ).status,
    400,
    'order masa depan',
  );
  assert.equal((await post(today)).status, 201, 'hari ini tetap boleh');
  assert.equal(
    (await api('GET', '/monitoring/export?month=0000-01&format=csv', { cookie: admin })).status,
    400,
    'bulan 0000',
  );
});

// ---------- Bug logika ----------
test('mengubah initial stock tidak boleh membuat stok negatif', async () => {
  const c = (
    await api('POST', '/consumables', {
      cookie: admin,
      body: { code: 'INI', name: 'Ini', unit: 'PCS', initialStock: 100 },
    })
  ).data;
  assert.equal(
    (
      await api('POST', '/stock-out', {
        cookie: admin,
        body: { date: today, name: 'x', consumableId: c.id, qty: 100 },
      })
    ).status,
    201,
  );
  const bad = await api('PUT', `/consumables/${c.id}`, {
    cookie: admin,
    body: { initialStock: 50 },
  });
  assert.equal(bad.status, 422);
  assert.equal(
    (await api('PUT', `/consumables/${c.id}`, { cookie: admin, body: { initialStock: 150 } }))
      .status,
    200,
  );
  assert.equal(
    (await api('PUT', `/consumables/${c.id}`, { cookie: admin, body: { name: 'Nama baru' } })).data
      .initialStock,
    150,
    'update parsial tidak mereset field lain',
  );
});

test('transaksi stok memakai isolasi READ COMMITTED (mencegah stok negatif saat dua orang mencatat bersamaan)', async () => {
  fake.__txOptions.length = 0;
  await api('POST', '/stock-out', {
    cookie: admin,
    body: { date: today, name: 'x', consumableId: item.id, qty: 1 },
  });
  await api('POST', '/stock-in', {
    cookie: admin,
    body: { date: today, name: 'x', poNumber: 'P', consumableId: item.id, qty: 1 },
  });
  const last = (await api('GET', '/stock-in', { cookie: admin })).data.data[0];
  await api('DELETE', `/stock-in/${last.id}`, { cookie: admin });
  assert.ok(fake.__txOptions.length >= 3);
  for (const o of fake.__txOptions) assert.equal(o?.isolationLevel, 'ReadCommitted');
});

// ---------- CSV / Excel injection ----------
test('export: sel yang diawali = + - @ dinetralkan (CSV injection)', async () => {
  const c = (
    await api('POST', '/consumables', {
      cookie: admin,
      body: {
        code: '=CMD',
        name: '=HYPERLINK("http://jahat.com","klik")',
        unit: 'PCS',
        initialStock: 1,
      },
    })
  ).data;
  assert.ok(c.id);
  const csv = (
    await api('GET', `/monitoring/export?month=${today.slice(0, 7)}&format=csv`, { cookie: admin })
  ).data.toString('utf8');
  const cells = csv.split(/\r?\n/).flatMap((l) => l.split(';'));
  assert.equal(
    cells.some((x) => /^"?[=+\-@]/.test(x) && !/^"?'/.test(x) && /HYPERLINK|CMD/.test(x)),
    false,
  );
  assert.ok(csv.includes("'=HYPERLINK") || csv.includes("'=CMD"));
});

// ---------- Konfigurasi production (proses terpisah) ----------
function runChild(envOverrides, body) {
  const script = `
    Object.assign(process.env, ${JSON.stringify({ NODE_ENV: 'production', DATABASE_URL: 'mysql://x', ...envOverrides })});
    const { makeFakePrisma } = require(${JSON.stringify(path.join(__dirname, 'helpers/fake-prisma.js'))});
    const fake = makeFakePrisma();
    const p = require.resolve(${JSON.stringify(prismaPath)});
    require.cache[p] = { id: p, filename: p, loaded: true, exports: fake };
    ${body}`;
  return spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 20000 });
}

test('production: JWT_SECRET contoh / terlalu pendek ditolak saat startup', () => {
  const placeholder = runChild(
    { JWT_SECRET: 'ganti-dengan-string-acak-minimal-32-karakter' },
    `require(${JSON.stringify(path.join(__dirname, '../src/config/env.js'))});`,
  );
  assert.notEqual(placeholder.status, 0, 'placeholder harus ditolak');
  const short = runChild(
    { JWT_SECRET: 'pendek-sekali-123456' },
    `require(${JSON.stringify(path.join(__dirname, '../src/config/env.js'))});`,
  );
  assert.notEqual(short.status, 0, 'secret < 32 karakter harus ditolak di production');
  const ok = runChild(
    { JWT_SECRET: 'a'.repeat(20) + 'Xk9#qLm2$vZ8@pR4' },
    `require(${JSON.stringify(path.join(__dirname, '../src/config/env.js'))});`,
  );
  assert.equal(ok.status, 0, ok.stderr);
});

test('production: cookie Secure, error 500 tidak membocorkan detail', () => {
  const r = runChild(
    { JWT_SECRET: 'b'.repeat(20) + 'Xk9#qLm2$vZ8@pR4', COOKIE_SECURE: 'true' },
    `const bcrypt = require('bcryptjs');
     (async () => {
       await fake.user.create({ data: { username: 'admin', name: 'A', role: 'ADMIN', passwordHash: bcrypt.hashSync('Admin#1', 4) } });
       const app = require(${JSON.stringify(path.join(__dirname, '../src/app.js'))});
       const srv = app.listen(0, async () => {
         const base = 'http://127.0.0.1:' + srv.address().port + '/api/v1';
         const lr = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'Admin#1' }) });
         const cookie = lr.headers.get('set-cookie');
         fake.user.findUnique = async () => { throw new Error('koneksi gagal password=SuperRahasia host=10.0.0.5'); };
         const er = await fetch(base + '/auth/me', { headers: { Cookie: cookie.split(';')[0] } });
         console.log(JSON.stringify({ cookie, status: er.status, body: await er.text() }));
         process.exit(0);
       });
     })();`,
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.match(out.cookie, /Secure/i);
  assert.equal(out.status, 500);
  assert.equal(/SuperRahasia|10\.0\.0\.5|\bat\s.+\(/.test(out.body), false, out.body);
});

// ---------- Brute force (taruh paling akhir: menghabiskan jatah login) ----------
test('login dibatasi: percobaan gagal berulang -> 429, dan tidak bisa dilewati dengan header X-Forwarded-For palsu', async () => {
  let blocked = false;
  for (let i = 0; i < 40 && !blocked; i++) {
    const r = await api('POST', '/auth/login', {
      body: { username: 'admin', password: `salah-${i}` },
      headers: { 'X-Forwarded-For': `203.0.113.${i + 1}` },
    });
    blocked = r.status === 429;
  }
  assert.equal(blocked, true, 'pembatasan login bisa dilewati dengan memalsukan X-Forwarded-For');
});
