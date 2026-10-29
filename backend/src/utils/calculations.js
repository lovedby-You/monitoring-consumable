// Rumus monitoring stok. Periode = N hari terakhir (default 30 hari).
// Penjelasan lengkap tiap kolom ada di README.

const round2 = (n) => Math.round(n * 100) / 100;

// stok akhir (left over) = stok awal + total IN - total OUT
const calcStockAkhir = (stokAwal, totalIn, totalOut) => stokAwal + totalIn - totalOut;

// rata-rata pemakaian per hari (hari tanpa OUT dihitung 0)
const calcAverageUsage = (totalOut, periodDays) => (periodDays > 0 ? totalOut / periodDays : 0);

// qty to order = pembulatan (avg usage x cakupan hari), dihitung dari total OUT agar tidak kena error desimal
const calcQuantityToOrder = (totalOut, coverDays, periodDays) =>
  periodDays > 0 ? Math.round((totalOut * coverDays) / periodDays) : 0;

function buildMonitoringRow(item, stats, params) {
  const { carryOver, totalIn, totalOut, maxQty, minQty } = stats;
  const { periodDays, leadTimeDays, coverDays } = params;

  const leftOver = calcStockAkhir(carryOver, totalIn, totalOut);
  const avg = calcAverageUsage(totalOut, periodDays);
  const orderPoint = avg * leadTimeDays;

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    unit: item.unit,
    carryOver,
    totalIn,
    totalOut,
    leftOver,
    averageUsage: round2(avg),
    maxQty,
    minQty,
    awu: round2(avg * 7),
    orderPoint: round2(orderPoint),
    leadTimeDays,
    safetyStock: Math.round(orderPoint),
    orderAlert: leftOver <= orderPoint,
    quantityToOrder: calcQuantityToOrder(totalOut, coverDays, periodDays),
  };
}

module.exports = {
  round2,
  calcStockAkhir,
  calcAverageUsage,
  calcQuantityToOrder,
  buildMonitoringRow,
};
