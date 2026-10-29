const { z } = require('zod');
const int0 = z.coerce.number().int().min(0).max(100_000_000, 'Angka terlalu besar');
const base = {
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  unit: z.enum(['PCS', 'ROLL'], { message: 'Unit hanya boleh PCS atau ROLL' }),
  initialStock: int0.default(0),
  unitCost: z.coerce.number().min(0).max(999999999999).default(0),
  isActive: z.boolean().default(true),
};
const createSchema = z.object(base);
const updateSchema = z.object(base).partial();
const listQuery = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  all: z.enum(['true', 'false']).default('false'), // all=true: tanpa pagination (dropdown)
  includeInactive: z.enum(['true', 'false']).default('false'),
});
module.exports = { createSchema, updateSchema, listQuery };
