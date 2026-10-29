const { z } = require('zod');
const { isValidDateStr, todayStr } = require('../../utils/dates');

const dateStr = z.string().refine(isValidDateStr, 'Format tanggal harus YYYY-MM-DD');
// tanggal transaksi tidak boleh di masa depan (mencegah salah ketik tahun)
const pastDate = dateStr.refine(
  (d) => d <= todayStr(process.env.APP_TIMEZONE || 'Asia/Jakarta'),
  'Tanggal tidak boleh di masa depan',
);
const base = {
  date: pastDate,
  name: z.string().trim().min(1, 'Nama wajib diisi').max(150),
  consumableId: z.coerce.number().int().positive('Jenis consumable wajib dipilih'),
  qty: z.coerce
    .number()
    .int()
    .positive('Quantity harus bilangan bulat > 0')
    .max(10_000_000, 'Quantity terlalu besar'),
};

// StockIn: tanggal, nama, no PO, jenis consumable, quantity
const stockInSchema = z.object({
  ...base,
  poNumber: z.string().trim().min(1, 'No. PO wajib diisi').max(80),
});
// StockOut: tanggal, nama, jenis consumable, quantity
const stockOutSchema = z.object(base);

const listQuery = z.object({
  consumableId: z.coerce.number().int().positive().optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

module.exports = { stockInSchema, stockOutSchema, listQuery };
