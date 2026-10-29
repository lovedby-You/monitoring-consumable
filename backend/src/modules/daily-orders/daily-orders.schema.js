const { z } = require('zod');
const { isValidDateStr, todayStr } = require('../../utils/dates');

const dateStr = z.string().refine(isValidDateStr, 'Format tanggal harus YYYY-MM-DD');
const upsertSchema = z.object({
  date: dateStr.refine(
    (d) => d <= todayStr(process.env.APP_TIMEZONE || 'Asia/Jakarta'),
    'Tanggal tidak boleh di masa depan',
  ),
  totalOrders: z.coerce
    .number()
    .int()
    .min(0, 'Total order tidak boleh negatif')
    .max(10_000_000, 'Total order terlalu besar'),
});
const listQuery = z.object({
  from: dateStr.optional(),
  to: dateStr.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});
module.exports = { upsertSchema, listQuery };
