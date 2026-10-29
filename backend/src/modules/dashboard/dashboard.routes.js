const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/errors');
const service = require('./dashboard.service');
router.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => res.json(await service.getDashboard())),
);
module.exports = router;
