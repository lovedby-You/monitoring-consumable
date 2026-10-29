const router = require('express').Router();
const { z } = require('zod');
const validate = require('../../middleware/validate');
const { authenticate, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/errors');
const s = require('./consumables.schema');
const service = require('./consumables.service');
const idParam = z.object({ id: z.coerce.number().int().positive() });

router.use(authenticate);
router.get(
  '/',
  validate(s.listQuery, 'query'),
  asyncHandler(async (req, res) => res.json(await service.list(req.query))),
);
router.post(
  '/',
  requireRole('ADMIN'),
  validate(s.createSchema),
  asyncHandler(async (req, res) => res.status(201).json(await service.create(req.body))),
);
router.put(
  '/:id',
  requireRole('ADMIN'),
  validate(idParam, 'params'),
  validate(s.updateSchema),
  asyncHandler(async (req, res) => res.json(await service.update(req.params.id, req.body))),
);
router.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    await service.remove(req.params.id);
    res.status(204).end();
  }),
);
module.exports = router;
