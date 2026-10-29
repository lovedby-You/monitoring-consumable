const prisma = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const { totalsAllTime } = require('../stock/stock.repository');
const { calcStockAkhir } = require('../../utils/calculations');
const { lockedStock, TX_OPTIONS } = require('../stock/stock.core');

const serialize = (c) => ({ ...c, unitCost: Number(c.unitCost) });

// Tambahkan stok saat ini (initial + IN - OUT) ke setiap baris
async function withStock(rows) {
  const totals = await totalsAllTime(
    prisma,
    rows.map((r) => r.id),
  );
  return rows.map((c) => {
    const t = totals.get(c.id) || { totalIn: 0, totalOut: 0 };
    return { ...serialize(c), stock: calcStockAkhir(c.initialStock, t.totalIn, t.totalOut) };
  });
}

async function list({ q, page, pageSize, all, includeInactive }) {
  const where = {
    ...(includeInactive === 'true' ? {} : { isActive: true }),
    ...(q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }] } : {}),
  };
  if (all === 'true') {
    const rows = await prisma.consumable.findMany({ where, orderBy: { name: 'asc' } });
    return { data: await withStock(rows), total: rows.length };
  }
  const [rows, total] = await Promise.all([
    prisma.consumable.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.consumable.count({ where }),
  ]);
  return { data: await withStock(rows), total, page, pageSize };
}
const create = async (data) => serialize(await prisma.consumable.create({ data }));
// Mengubah initial stock tidak boleh membuat stok saat ini menjadi negatif
async function update(id, data) {
  return prisma.$transaction(async (tx) => {
    if (data.initialStock !== undefined) {
      const stock = await lockedStock(tx, id);
      const current = await tx.consumable.findUnique({ where: { id } });
      if (stock - current.initialStock + data.initialStock < 0) {
        throw new AppError(
          422,
          `Initial stock terlalu kecil: stok saat ini ${stock}, stok akan menjadi negatif`,
        );
      }
    }
    return serialize(await tx.consumable.update({ where: { id }, data }));
  }, TX_OPTIONS);
}
async function remove(id) {
  const used =
    (await prisma.stockIn.count({ where: { consumableId: id } })) +
    (await prisma.stockOut.count({ where: { consumableId: id } }));
  if (used > 0)
    throw new AppError(
      409,
      'Item sudah punya transaksi. Nonaktifkan item (isActive=false) sebagai gantinya.',
    );
  await prisma.consumable.delete({ where: { id } });
}
module.exports = { list, create, update, remove };
