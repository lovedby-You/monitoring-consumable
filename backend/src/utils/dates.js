// Semua tanggal bisnis diperlakukan sebagai string 'YYYY-MM-DD' pada zona waktu aplikasi,
// lalu disimpan sebagai kolom DATE (UTC midnight di sisi Prisma).
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayStr(tz = 'Asia/Jakarta', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
const toDate = (str) => new Date(`${str}T00:00:00.000Z`);
const toStr = (d) => d.toISOString().slice(0, 10);
function addDays(str, n) {
  const d = toDate(str);
  d.setUTCDate(d.getUTCDate() + n);
  return toStr(d);
}
// tanggal valid dan dalam rentang wajar (tahun 2000-2100)
function isValidDateStr(str) {
  if (!DATE_RE.test(str) || toStr(toDate(str)) !== str) return false;
  const year = Number(str.slice(0, 4));
  return year >= 2000 && year <= 2100;
}
function rangeDays(fromStr, toStrVal) {
  const out = [];
  for (let d = fromStr; d <= toStrVal; d = addDays(d, 1)) out.push(d);
  return out;
}
const MONTH_RE = /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
/** 'YYYY-MM' -> { from, to, days, year, month } */
function monthRange(m) {
  const [year, month] = m.split('-').map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${m}-01`, to: `${m}-${String(days).padStart(2, '0')}`, days, year, month };
}
module.exports = {
  MONTH_RE,
  MONTH_NAMES,
  MONTH_SHORT,
  monthRange,
  todayStr,
  toDate,
  toStr,
  addDays,
  isValidDateStr,
  rangeDays,
};
