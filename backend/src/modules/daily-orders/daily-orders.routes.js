const router = require('express').Router();
const { z } = require('zod');
const validate = require('../../middleware/validate');
const { authenticate, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/errors');
const s = require('./daily-orders.schema');
const service = require('./daily-orders.service');

router.use(authenticate, requireRole('ADMIN'));
router.get(
  '/',
  validate(s.listQuery, 'query'),
  asyncHandler(async (req, res) => res.json(await service.list(req.query))),
);
router.put(
  '/',
  validate(s.upsertSchema),
  asyncHandler(async (req, res) => res.json(await service.upsertOne(req.body))),
);
router.delete(
  '/:id',
  validate(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  asyncHandler(async (req, res) => {
    await service.remove(req.params.id);
    res.status(204).end();
  }),
);
module.exports = router;
