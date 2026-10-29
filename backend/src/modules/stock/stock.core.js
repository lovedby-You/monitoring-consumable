const { AppError } = require('../../utils/errors');
const { calcStockAkhir } = require('../../utils/calculations');
const { totalsAllTime } = require('./stock.repository');

/** Kunci baris consumable (SELECT ... FOR UPDATE) lalu hitung stok terkini di dalam transaksi. */
async function lockedStock(tx, consumableId) {
  const locked =
    await tx.$queryRaw`SELECT id, initialStock FROM Consumable WHERE id = ${consumableId} FOR UPDATE`;
  if (!locked.length) throw new AppError(404, 'Consumable tidak ditemukan');
  const t = (await totalsAllTime(tx, [consumableId])).get(consumableId) || {
    totalIn: 0,
    totalOut: 0,
  };
  return calcStockAkhir(Number(locked[0].initialStock), t.totalIn, t.totalOut);
}
// READ COMMITTED: setelah baris dikunci, penjumlahan stok selalu membaca data terbaru.
// (Dengan REPEATABLE READ bawaan MySQL, dua orang yang mencatat bersamaan bisa membuat stok negatif.)
const TX_OPTIONS = { isolationLevel: 'ReadCommitted' };

module.exports = { lockedStock, TX_OPTIONS };
