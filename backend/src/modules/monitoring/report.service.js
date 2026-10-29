const prisma = require('../../lib/prisma');
const env = require('../../config/env');
const { monthRange, toDate, toStr } = require('../../utils/dates');
const { totalsBefore } = require('../stock/stock.repository');
const { buildReport } = require('./report');

async function getMonthlyReport({ month, leadTime, coverDays }) {
  const { from, to } = monthRange(month);
  const range = { date: { gte: toDate(from), lte: toDate(to) } };
  const daily$ = (model) =>
    prisma[model].groupBy({ by: ['consumableId', 'date'], where: range, _sum: { qty: true } });
  const [items, before, inRows, outRows] = await Promise.all([
    prisma.consumable.findMany({ orderBy: { id: 'asc' } }), // urutan = urutan input master
    totalsBefore(toDate(from)),
    daily$('stockIn'),
    daily$('stockOut'),
  ]);
  const conv = (rows, type) =>
    rows.map((r) => ({
      consumableId: r.consumableId,
      date: toStr(r.date),
      type,
      qty: r._sum.qty || 0,
    }));
  const movements = [...conv(inRows, 'IN'), ...conv(outRows, 'OUT')];
  return buildReport({
    month,
    items,
    before,
    movements,
    leadTimeDays: leadTime ?? env.LEAD_TIME_DAYS,
    coverDays: coverDays || env.ORDER_COVER_DAYS,
  });
}
module.exports = { getMonthlyReport };
