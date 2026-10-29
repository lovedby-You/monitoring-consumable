require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET minimal 16 karakter'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  APP_TIMEZONE: z.string().default('Asia/Jakarta'),
  USAGE_PERIOD_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  LEAD_TIME_DAYS: z.coerce.number().int().min(0).max(365).default(8),
  ORDER_COVER_DAYS: z.coerce.number().int().min(1).max(365).default(75),
  // jumlah proxy tepercaya di depan aplikasi (0 = tanpa proxy). Jangan isi jika tidak memakai proxy.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  // folder hasil build frontend (opsional). Bawaan: ../frontend/dist
  FRONTEND_DIST: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Konfigurasi .env tidak valid:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// Di production, JWT_SECRET harus panjang dan bukan teks contoh
if (parsed.data.NODE_ENV === 'production') {
  const secret = parsed.data.JWT_SECRET;
  if (secret.length < 32 || /ganti|changeme|contoh|example|secret/i.test(secret)) {
    console.error(
      'JWT_SECRET tidak aman untuk production: minimal 32 karakter acak, bukan teks contoh.',
    );
    process.exit(1);
  }
  if (parsed.data.COOKIE_SECURE !== 'true') {
    console.warn(
      'PERINGATAN: COOKIE_SECURE=false di production. Gunakan HTTPS dan set COOKIE_SECURE=true.',
    );
  }
}
module.exports = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  cookieSecure: parsed.data.COOKIE_SECURE === 'true',
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((s) => s.trim()),
};
