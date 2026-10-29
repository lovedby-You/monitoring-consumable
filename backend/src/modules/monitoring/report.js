// Menyusun laporan bulanan (murni, tanpa akses DB) -> dipakai exporter CSV / Excel / PDF.
const { monthRange, rangeDays, MONTH_NAMES, MONTH_SHORT } = require('../../utils/dates');
const { buildMonitoringRow } = require('../../utils/calculations');

const sum = (a) => a.reduce((x, y) => x + y, 0);

/**
 * @param month       'YYYY-MM'
 * @param items       semua consumable (Prisma rows)
 * @param before      Map<consumableId,{totalIn,totalOut}> total semua transaksi SEBELUM tanggal 1 bulan tsb
 * @param movements   [{ consumableId, date:'YYYY-MM-DD', type:'IN'|'OUT', qty }] (agregat per hari) di dalam bulan
 */
function buildReport({ month, items, before, movements, leadTimeDays, coverDays }) {
  const { from, to, days, year, month: mi } = monthRange(month);
  const dayList = rangeDays(from, to);
  const dayIndex = new Map(dayList.map((d, i) => [d, i]));

  const daily = new Map();
  for (const m of movements) {
    const i = dayIndex.get(m.date);
    if (i === undefined) continue;
    const e = daily.get(m.consumableId) || { in: Array(days).fill(0), out: Array(days).fill(0) };
    e[m.type === 'IN' ? 'in' : 'out'][i] += m.qty;
    daily.set(m.consumableId, e);
  }

  // item nonaktif tetap muncul bila punya transaksi pada bulan tsb
  const used = items.filter((it) => it.isActive || daily.has(it.id));
  const rows = used.map((it, idx) => {
    const d = daily.get(it.id) || { in: Array(days).fill(0), out: Array(days).fill(0) };
    const totalIn = sum(d.in);
    const totalOut = sum(d.out);
    const b = before.get(it.id) || { totalIn: 0, totalOut: 0 };
    const carryOver = it.initialStock + b.totalIn - b.totalOut;
    const base = buildMonitoringRow(
      it,
      {
        carryOver,
        totalIn,
        totalOut,
        maxQty: Math.max(...d.in, ...d.out),
        minQty: Math.min(...d.in, ...d.out),
      },
      { periodDays: days, leadTimeDays, coverDays },
    );
    const price = Number(it.unitCost);
    return {
      ...base,
      no: idx + 1,
      price,
      initialAmount: carryOver * price,
      finalAmountUsed: totalOut * price,
      daily: d,
    };
  });

  return {
    month,
    from,
    to,
    daysInMonth: days,
    label: `1-${days} ${MONTH_NAMES[mi - 1]} ${year}`,
    dayLabels: dayList.map((_, i) => `${i + 1}-${MONTH_SHORT[mi - 1]}`),
    leadTimeDays,
    coverDays,
    coverLabel: coverDays % 25 === 0 ? `${coverDays / 25} month` : `${coverDays} days`,
    rows,
    totals: {
      initialAmount: sum(rows.map((r) => r.initialAmount)),
      finalAmountUsed: sum(rows.map((r) => r.finalAmountUsed)),
    },
  };
}
module.exports = { buildReport };
