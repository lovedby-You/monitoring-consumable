const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../lib/prisma');
const { AppError, asyncHandler } = require('../utils/errors');

const COOKIE = 'wms_token';

const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new AppError(401, 'Silakan login terlebih dahulu');
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'Sesi tidak valid atau kedaluwarsa');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new AppError(401, 'Akun tidak aktif');
  req.user = { id: user.id, username: user.username, name: user.name, role: user.role };
  next();
});

// RBAC: requireRole('ADMIN')
const requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(new AppError(403, 'Anda tidak memiliki akses'));

module.exports = { authenticate, requireRole, COOKIE };
