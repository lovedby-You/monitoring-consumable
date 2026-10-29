// Seed: membuat akun awal + (opsional) data demo.
//   npm run seed                 -> akun + data demo
//   SEED_DEMO=false npm run seed -> hanya akun
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { getAccounts } = require('./accounts');
const { todayStr, addDays, toDate } = require('../src/utils/dates');

const prisma = new PrismaClient();
const tz = process.env.APP_TIMEZONE || 'Asia/Jakarta';

// PRNG deterministik agar data demo konsisten
let seed = 42;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const between = (a, b) => Math.floor(a + rnd() * (b - a + 1));

// perOrder = rata-rata pemakaian per order (hanya untuk membangkitkan data demo)
const CONSUMABLES = [
  {
    code: 'BX-S',
    name: 'Box Karton Kecil',
    unit: 'PCS',
    initialStock: 500,
    unitCost: 2500,
    perOrder: 0.45,
    restock: 400,
  },
  {
    code: 'BX-M',
    name: 'Box Karton Sedang',
    unit: 'PCS',
    initialStock: 400,
    unitCost: 3800,
    perOrder: 0.3,
    restock: 300,
  },
  {
    code: 'BX-L',
    name: 'Box Karton Besar',
    unit: 'PCS',
    initialStock: 200,
    unitCost: 5500,
    perOrder: 0.1,
    restock: 160,
  },
  {
    code: 'TP-48',
    name: 'Lakban Bening 48mm',
    unit: 'ROLL',
    initialStock: 120,
    unitCost: 9500,
    perOrder: 0.06,
    restock: 80,
  },
  {
    code: 'TP-FR',
    name: 'Lakban Fragile',
    unit: 'ROLL',
    initialStock: 60,
    unitCost: 12500,
    perOrder: 0.03,
    restock: 40,
  },
  {
    code: 'BW-RL',
    name: 'Bubble Wrap',
    unit: 'ROLL',
    initialStock: 40,
    unitCost: 185000,
    perOrder: 0.02,
    restock: 0,
  },
  {
    code: 'PL-AM',
    name: 'Plastik Polymailer',
    unit: 'PCS',
    initialStock: 1000,
    unitCost: 900,
    perOrder: 0.5,
    restock: 0,
  },
  {
    code: 'LB-TH',
    name: 'Label Thermal 100x150',
    unit: 'ROLL',
    initialStock: 80,
    unitCost: 48000,
    perOrder: 0.04,
    restock: 0,
  },
];
const SUPPLIERS = ['PT Kemasan Jaya', 'CV Sinar Plastik', 'Toko Bahan Packing'];
const TAKERS = ['Tim Packing A', 'Tim Packing B', 'Rina', 'Budi'];

async function main() {
  const admins = [];
  for (const { username, name, role, password } of getAccounts()) {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { username },
      update: {},
      create: { username, name, role, passwordHash },
    });
    if (role === 'ADMIN') admins.push(user);
    console.log('Akun siap:', username, `(${role})`);
  }
  const admin = admins[0];

  if (process.env.SEED_DEMO === 'false') return;
  if ((await prisma.stockIn.count()) + (await prisma.stockOut.count()) > 0)
    return console.log('Data transaksi sudah ada, data demo dilewati.');

  const ids = {};
  for (const c of CONSUMABLES) {
    const row = await prisma.consumable.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        unit: c.unit,
        initialStock: c.initialStock,
        unitCost: c.unitCost,
      },
    });
    ids[c.code] = row.id;
  }

  const today = todayStr(tz);
  const orders = [];
  const stockIns = [];
  const stockOuts = [];
  for (let i = 29; i >= 0; i--) {
    const date = addDays(today, -i);
    const total = between(60, 180);
    orders.push({ date: toDate(date), totalOrders: total });
    for (const c of CONSUMABLES) {
      stockOuts.push({
        date: toDate(date),
        name: TAKERS[between(0, TAKERS.length - 1)],
        consumableId: ids[c.code],
        qty: Math.max(1, Math.round(total * c.perOrder * (0.8 + rnd() * 0.4))),
        createdById: admin.id,
      });
    }
    // restock tiap ~10 hari
    if (i % 10 === 0 && i !== 0) {
      for (const c of CONSUMABLES.filter((x) => x.restock > 0)) {
        stockIns.push({
          date: toDate(date),
          name: SUPPLIERS[between(0, SUPPLIERS.length - 1)],
          poNumber: `PO-${date.replace(/-/g, '')}-${c.code}`,
          consumableId: ids[c.code],
          qty: Math.round(c.restock * (0.8 + rnd() * 0.5)),
          createdById: admin.id,
        });
      }
    }
  }
  await prisma.dailyOrder.createMany({ data: orders, skipDuplicates: true });
  await prisma.stockIn.createMany({ data: stockIns });
  await prisma.stockOut.createMany({ data: stockOuts });

  // pastikan tidak ada stok negatif; bila ada, tambahkan penerimaan koreksi
  for (const c of CONSUMABLES) {
    const id = ids[c.code];
    const [i, o] = await Promise.all([
      prisma.stockIn.aggregate({ where: { consumableId: id }, _sum: { qty: true } }),
      prisma.stockOut.aggregate({ where: { consumableId: id }, _sum: { qty: true } }),
    ]);
    const stock = c.initialStock + (i._sum.qty || 0) - (o._sum.qty || 0);
    if (stock < 0)
      await prisma.stockIn.create({
        data: {
          date: toDate(addDays(today, -29)),
          name: 'Koreksi seed',
          poNumber: 'PO-KOREKSI',
          consumableId: id,
          qty: -stock + 20,
          createdById: admin.id,
        },
      });
  }
  console.log('Seed selesai: 8 consumable, penerimaan & pengambilan 30 hari, order harian demo.');
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
