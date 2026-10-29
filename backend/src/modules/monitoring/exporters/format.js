// Format angka gaya Indonesia seperti pada file CSV acuan: 1.234.567 dan 182,00
const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dec2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const money = (n) => `IDR ${group(n)}`;
const alertText = (r) => (r.orderAlert ? 'Need order' : 'Safe');
const unitText = (r) => r.unit.toLowerCase();
const qtyHeader = (rep) => `Quantity to be Ordered for ${rep.coverLabel}`;
module.exports = { group, dec2, money, alertText, unitText, qtyHeader };
