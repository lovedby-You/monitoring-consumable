const router = require('express').Router();
const { z } = require('zod');
const validate = require('../../middleware/validate');
const { authenticate, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/errors');
const service = require('./monitoring.service');
const { getMonthlyReport } = require('./report.service');
const { toCsv } = require('./exporters/csv');
const { toXlsx } = require('./exporters/xlsx');
const { toPdf } = require('./exporters/pdf');
const { MONTH_RE } = require('../../utils/dates');

const exportQuery = z.object({
  month: z.string().regex(MONTH_RE, 'Format bulan harus YYYY-MM'),
  format: z.enum(['csv', 'xlsx', 'pdf']),
  leadTime: z.coerce.number().int().min(0).max(365).optional(),
  coverDays: z.coerce.number().int().min(1).max(365).optional(),
});
const MIME = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

router.use(authenticate, requireRole('ADMIN'));
router.get(
  '/',
  validate(
    z.object({
      days: z.coerce.number().int().min(1).max(365).optional(),
      leadTime: z.coerce.number().int().min(0).max(365).optional(),
      coverDays: z.coerce.number().int().min(1).max(365).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => res.json(await service.getMonitoring(req.query))),
);

// Export laporan bulanan: GET /monitoring/export?month=2026-08&format=csv|xlsx|pdf
router.get(
  '/export',
  validate(exportQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { month, format } = req.query;
    const report = await getMonthlyReport(req.query);
    const body =
      format === 'csv'
        ? toCsv(report)
        : format === 'xlsx'
          ? await toXlsx(report)
          : await toPdf(report);
    res.setHeader('Content-Type', MIME[format]);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="consumable-report-${month}.${format}"`,
    );
    res.send(body);
  }),
);
module.exports = router;
