// Agregasi stok dari dua tabel: StockIn (penerimaan) dan StockOut (pengambilan)
const prisma = require('../../lib/prisma');

async function sumByConsumable(db, model, where) {
  const rows = await db[model].groupBy({ by: ['consumableId'], where, _sum: { qty: true } });
  return new Map(rows.map((r) => [r.consumableId, r._sum.qty || 0]));
}

function merge(ins, outs) {
  const map = new Map();
  for (const id of new Set([...ins.keys(), ...outs.keys()])) {
    map.set(id, { totalIn: ins.get(id) || 0, totalOut: outs.get(id) || 0 });
  }
  return map;
}

/** Total IN & OUT sepanjang waktu -> Map<consumableId,{totalIn,totalOut}> */
async function totalsAllTime(db = prisma, consumableIds) {
  const where = consumableIds ? { consumableId: { in: consumableIds } } : {};
  const [ins, outs] = await Promise.all([
    sumByConsumable(db, 'stockIn', where),
    sumByConsumable(db, 'stockOut', where),
  ]);
  return merge(ins, outs);
}

/** Total IN & OUT pada rentang tanggal (Date, inklusif) */
async function totalsBetween(from, to) {
  const where = { date: { gte: from, lte: to } };
  const [ins, outs] = await Promise.all([
    sumByConsumable(prisma, 'stockIn', where),
    sumByConsumable(prisma, 'stockOut', where),
  ]);
  return merge(ins, outs);
}

/** Total IN & OUT sebelum tanggal tertentu (Date, eksklusif) */
async function totalsBefore(date) {
  const where = { date: { lt: date } };
  const [ins, outs] = await Promise.all([
    sumByConsumable(prisma, 'stockIn', where),
    sumByConsumable(prisma, 'stockOut', where),
  ]);
  return merge(ins, outs);
}

module.exports = { totalsAllTime, totalsBetween, totalsBefore };
