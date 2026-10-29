const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const prisma = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');

// hash dummy dengan cost sama seperti hash asli, agar waktu respons tidak membocorkan username yang ada
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

async function login(username, password) {
  const user = await prisma.user.findUnique({ where: { username } });
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !user.isActive || !ok) throw new AppError(401, 'Username atau password salah');
  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  });
  return {
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  };
}
module.exports = { login };
