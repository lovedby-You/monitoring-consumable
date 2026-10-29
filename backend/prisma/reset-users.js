// Membuat/mereset akun admin & staff (mis. lupa password). Jalankan: npm run users:reset
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { getAccounts } = require('./accounts');

const prisma = new PrismaClient();

async function main() {
  for (const { username, name, role, password } of getAccounts()) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { username },
      update: { passwordHash, isActive: true, role },
      create: { username, name, role, passwordHash },
    });
    console.log('OK:', username);
  }
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
