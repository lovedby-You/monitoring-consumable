const express = require('express');
const { z } = require('zod');
const validate = require('../../middleware/validate');
const { authenticate, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/errors');
const { listQuery } = require('./stock.schema');

const idParam = z.object({ id: z.coerce.number().int().positive() });

function createStockRouter(service, createSchema) {
  const router = express.Router();
  router.use(authenticate);
  router.get(
    '/',
    validate(listQuery, 'query'),
    asyncHandler(async (req, res) => res.json(await service.list(req.query))),
  );
  router.post(
    '/',
    validate(createSchema),
    asyncHandler(async (req, res) =>
      res.status(201).json(await service.create(req.body, req.user.id)),
    ),
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
  return router;
}
module.exports = { createStockRouter };
