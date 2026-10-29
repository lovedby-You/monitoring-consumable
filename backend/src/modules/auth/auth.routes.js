const router = require('express').Router();
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const env = require('../../config/env');
const validate = require('../../middleware/validate');
const { authenticate, COOKIE } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/errors');
const service = require('./auth.service');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true, // hanya percobaan gagal yang dihitung
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan login, coba lagi nanti' },
});
const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1).max(200),
});

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { token, user } = await service.login(req.body.username, req.body.password);
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.cookieSecure,
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({ user });
  }),
);
router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE);
  res.json({ message: 'Logout berhasil' });
});
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
module.exports = router;
