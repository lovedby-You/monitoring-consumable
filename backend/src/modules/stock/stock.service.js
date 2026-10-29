const prisma = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const { toDate, toStr } = require('../../utils/dates');
const { lockedStock, TX_OPTIONS } = require('./stock.core');

const include = {
  consumable: { select: { id: true, code: true, name: true, unit: true } },
  createdBy: { select: { id: true, name: true } },
};
const serialize = (m) => ({ ...m, date: toStr(m.date) });

/** Pabrik service untuk tabel StockIn (type 'IN') atau StockOut (type 'OUT'). */
function createStockService(type) {
  const model = type === 'IN' ? 'stockIn' : 'stockOut';

  async function list({ consumableId, from, to, q, page, pageSize }) {
    const where = {
      ...(consumableId ? { consumableId } : {}),
      ...(from || to
        ? { date: { ...(from ? { gte: toDate(from) } : {}), ...(to ? { lte: toDate(to) } : {}) } }
        : {}),
      ...(q
        ? {
            OR:
              type === 'IN'
                ? [{ name: { contains: q } }, { poNumber: { contains: q } }]
                : [{ name: { contains: q } }],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma[model].findMany({
        where,
        include,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma[model].count({ where }),
    ]);
    return { data: rows.map(serialize), total, page, pageSize };
  }

  async function create(data, userId) {
    return prisma.$transaction(async (tx) => {
      // kunci baris consumable lebih dulu, baru baca data lain (mencegah stok negatif saat bersamaan)
      const stock = await lockedStock(tx, data.consumableId);
      const item = await tx.consumable.findUnique({ where: { id: data.consumableId } });
      if (!item.isActive) throw new AppError(400, 'Consumable nonaktif');
      if (type === 'OUT' && data.qty > stock) {
        throw new AppError(
          422,
          `Stok tidak cukup. Stok saat ini ${stock} ${item.unit.toLowerCase()}, pengambilan diminta ${data.qty}`,
        );
      }
      const row = await tx[model].create({
        data: {
          date: toDate(data.date),
          name: data.name,
          ...(type === 'IN' ? { poNumber: data.poNumber } : {}),
          consumableId: data.consumableId,
          qty: data.qty,
          createdById: userId,
        },
        include,
      });
      return { ...serialize(row), stockAfter: stock + (type === 'IN' ? data.qty : -data.qty) };
    }, TX_OPTIONS);
  }

  /** Hapus transaksi (admin). Menghapus penerimaan tidak boleh membuat stok negatif. */
  async function remove(id) {
    await prisma.$transaction(async (tx) => {
      const m = await tx[model].findUnique({ where: { id } });
      if (!m) throw new AppError(404, 'Transaksi tidak ditemukan');
      if (type === 'IN') {
        const stock = await lockedStock(tx, m.consumableId);
        if (stock - m.qty < 0)
          throw new AppError(422, 'Penerimaan ini tidak bisa dihapus karena stok akan negatif');
      }
      await tx[model].delete({ where: { id } });
    }, TX_OPTIONS);
  }

  return { list, create, remove };
}

module.exports = { createStockService };
