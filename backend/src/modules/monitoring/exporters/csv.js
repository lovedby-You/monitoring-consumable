// CSV semicolon (;) seperti file acuan, dengan BOM agar Excel membaca UTF-8
const { group, dec2, money, alertText, unitText, qtyHeader } = require('./format');

const cell = (v) => {
  let s = v == null ? '' : String(v);
  // teks yang diawali = + - @ bisa dibaca Excel sebagai rumus -> beri tanda petik di depan
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsv(rep) {
  const lines = [];
  lines.push(['Consumable report']);
  lines.push([`Periode ${rep.label}`]);
  const dayHead = rep.dayLabels.flatMap((l) => [l, '']);
  lines.push([
    'No',
    'Item name',
    'SKU / Code',
    'Unit',
    'Carry Over',
    '',
    '',
    '',
    ...dayHead,
    'Total In',
    'Total Out',
    'Left over',
    'Avg. usage',
    'Max. Qty in/out',
    'Min. Qty in/out',
    'AWU',
    'Order Point',
    'LT order',
    'Mathematical safety stock',
    'Order Alert',
    qtyHeader(rep),
  ]);
  lines.push([
    '',
    '',
    '',
    '',
    '',
    'Price',
    'Initial Amount',
    'Final Amount used',
    ...rep.dayLabels.flatMap(() => ['In', 'Out']),
  ]);
  lines.push([]);
  for (const r of rep.rows) {
    const days = r.daily.in.flatMap((v, i) => [v, r.daily.out[i]]);
    lines.push([
      r.no,
      r.name,
      r.code,
      unitText(r),
      r.carryOver,
      group(r.price),
      money(r.initialAmount),
      money(r.finalAmountUsed),
      ...days,
      r.carryOver + r.totalIn, // sama seperti file acuan: Total In sudah termasuk carry over
      r.totalOut,
      r.leftOver,
      dec2(r.averageUsage),
      r.maxQty,
      r.minQty,
      dec2(r.awu),
      dec2(r.orderPoint),
      r.leadTimeDays,
      r.safetyStock,
      alertText(r),
      r.quantityToOrder,
    ]);
  }
  lines.push([]);
  lines.push([
    '',
    'TOTAL Amount',
    '',
    '',
    '',
    '',
    money(rep.totals.initialAmount),
    money(rep.totals.finalAmountUsed),
  ]);
  return `\uFEFF${lines.map((l) => l.map(cell).join(';')).join('\r\n')}\r\n`;
}
module.exports = { toCsv };
