const prisma = require('../../lib/prisma');
const env = require('../../config/env');
const { todayStr, addDays, toDate, toStr, rangeDays } = require('../../utils/dates');
const { totalsAllTime, totalsBetween } = require('../stock/stock.repository');
const { calcStockAkhir, round2 } = require('../../utils/calculations');

const CHART_DAYS = 30;

async function getDashboard() {
  const today = todayStr(env.APP_TIMEZONE);
  const todayDate = toDate(today);
  const chartFrom = `${today.slice(0, 7)}-01`;

  const [items, all, todayTotals, orderRow, ordersSeries, outSeries] = await Promise.all([
    prisma.consumable.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    totalsAllTime(),
    totalsBetween(todayDate, todayDate),
    prisma.dailyOrder.findUnique({ where: { date: todayDate } }),
    prisma.dailyOrder.findMany({ where: { date: { gte: toDate(chartFrom), lte: todayDate } } }),
    prisma.stockOut.groupBy({
      by: ['date'],
      where: { date: { gte: toDate(chartFrom), lte: todayDate } },
      _sum: { qty: true },
    }),
  ]);

  const ordersToday = orderRow?.totalOrders || 0;
  let inventoryValue = 0;
  let totalInToday = 0;
  let totalOutToday = 0;

  // item tanpa transaksi hari ini tetap tampil dengan 0
  const perItem = items.map((it) => {
    const t = all.get(it.id) || { totalIn: 0, totalOut: 0 };
    const d = todayTotals.get(it.id) || { totalIn: 0, totalOut: 0 };
    const stock = calcStockAkhir(it.initialStock, t.totalIn, t.totalOut);
    const unitCost = Number(it.unitCost);
    inventoryValue += stock * unitCost;
    totalInToday += d.totalIn;
    totalOutToday += d.totalOut;
    return {
      id: it.id,
      code: it.code,
      name: it.name,
      unit: it.unit,
      totalInToday: d.totalIn,
      totalOutToday: d.totalOut,
      stock,
      unitCost,
      stockValue: round2(stock * unitCost),
      usagePerOrder: ordersToday > 0 ? round2(d.totalOut / ordersToday) : null,
    };
  });

  const ordersMap = new Map(ordersSeries.map((o) => [toStr(o.date), o.totalOrders]));
  const outMap = new Map(outSeries.map((o) => [toStr(o.date), o._sum.qty || 0]));
  const chart = rangeDays(chartFrom, today).map((date) => ({
    date,
    orders: ordersMap.get(date) || 0,
    totalUsage: outMap.get(date) || 0,
  }));

  return {
    date: today,
    summary: {
      totalInToday,
      totalOutToday,
      inventoryValue: round2(inventoryValue),
      ordersToday,
      // total usage = jumlah qty OUT semua item (campuran pcs/roll) / total order hari ini
      usagePerOrderTotal: ordersToday > 0 ? round2(totalOutToday / ordersToday) : null,
    },
    perItem,
    chart,
  };
}
module.exports = { getDashboard };
