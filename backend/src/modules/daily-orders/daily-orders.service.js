const prisma = require('../../lib/prisma');
const { toDate, toStr } = require('../../utils/dates');

const serialize = (o) => ({ ...o, date: toStr(o.date) });

async function list({ from, to, page, pageSize }) {
  const where =
    from || to
      ? { date: { ...(from ? { gte: toDate(from) } : {}), ...(to ? { lte: toDate(to) } : {}) } }
      : {};
  const [rows, total] = await Promise.all([
    prisma.dailyOrder.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dailyOrder.count({ where }),
  ]);
  return { data: rows.map(serialize), total, page, pageSize };
}

// Input per tanggal; tanggal yang sama diperbarui (upsert)
const upsertOne = async ({ date, totalOrders }) =>
  serialize(
    await prisma.dailyOrder.upsert({
      where: { date: toDate(date) },
      create: { date: toDate(date), totalOrders },
      update: { totalOrders },
    }),
  );

const remove = (id) => prisma.dailyOrder.delete({ where: { id } });

module.exports = { list, upsertOne, remove };
