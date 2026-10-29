const prisma = require('../../lib/prisma');
const env = require('../../config/env');
const { todayStr, addDays, toDate, toStr, rangeDays } = require('../../utils/dates');
const { totalsAllTime } = require('../stock/stock.repository');
const { buildMonitoringRow } = require('../../utils/calculations');

async function getMonitoring({ days, leadTime, coverDays } = {}) {
  const periodDays = days || env.USAGE_PERIOD_DAYS;
  const leadTimeDays = leadTime ?? env.LEAD_TIME_DAYS;
  const cover = coverDays || env.ORDER_COVER_DAYS;
  const to = todayStr(env.APP_TIMEZONE);
  const from = addDays(to, -(periodDays - 1)); // N hari terakhir termasuk hari ini
  const dayList = rangeDays(from, to);

  const range = { date: { gte: toDate(from), lte: toDate(to) } };
  const daily$ = (model) =>
    prisma[model].groupBy({ by: ['consumableId', 'date'], where: range, _sum: { qty: true } });
  const [items, allTime, inRows, outRows] = await Promise.all([
    prisma.consumable.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    totalsAllTime(),
    daily$('stockIn'),
    daily$('stockOut'),
  ]);

  // daily[consumableId] = { in: Map<date,qty>, out: Map<date,qty> }
  const daily = new Map();
  const put = (rows, key) => {
    for (const r of rows) {
      const e = daily.get(r.consumableId) || { in: new Map(), out: new Map() };
      e[key].set(toStr(r.date), r._sum.qty || 0);
      daily.set(r.consumableId, e);
    }
  };
  put(inRows, 'in');
  put(outRows, 'out');

  const rows = items.map((it) => {
    const d = daily.get(it.id) || { in: new Map(), out: new Map() };
    let totalIn = 0;
    let totalOut = 0;
    let maxQty = 0;
    let minQty = Infinity;
    for (const day of dayList) {
      const i = d.in.get(day) || 0;
      const o = d.out.get(day) || 0;
      totalIn += i;
      totalOut += o;
      maxQty = Math.max(maxQty, i, o);
      minQty = Math.min(minQty, i, o);
    }
    // carry over = saldo sebelum periode = stok semua waktu dikurangi pergerakan di dalam periode
    const all = allTime.get(it.id) || { totalIn: 0, totalOut: 0 };
    const carryOver = it.initialStock + all.totalIn - all.totalOut - totalIn + totalOut;
    return buildMonitoringRow(
      it,
      { carryOver, totalIn, totalOut, maxQty, minQty: minQty === Infinity ? 0 : minQty },
      { periodDays, leadTimeDays, coverDays: cover },
    );
  });

  return {
    periodDays,
    leadTimeDays,
    coverDays: cover,
    from,
    to,
    data: rows,
    alertCount: rows.filter((r) => r.orderAlert).length,
  };
}
module.exports = { getMonitoring };
