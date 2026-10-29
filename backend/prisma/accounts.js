// Daftar akun awal. Di production, password WAJIB diisi lewat .env (tidak ada password bawaan).
const DEFAULT_ADMIN = 'Admin#12345';
const DEFAULT_USER = 'Staff#12345';

function getAccounts() {
  const prod = process.env.NODE_ENV === 'production';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || (prod ? '' : DEFAULT_ADMIN);
  const userPass = process.env.SEED_USER_PASSWORD || (prod ? '' : DEFAULT_USER);
  if (prod) {
    for (const [nama, pass] of [
      ['SEED_ADMIN_PASSWORD', adminPass],
      ['SEED_USER_PASSWORD', userPass],
    ]) {
      if (pass.length < 10 || [DEFAULT_ADMIN, DEFAULT_USER].includes(pass)) {
        throw new Error(`${nama} wajib diisi di .env (minimal 10 karakter, bukan password bawaan)`);
      }
    }
  }
  return [
    {
      username: process.env.SEED_ADMIN_USERNAME || 'admin',
      name: 'Administrator',
      role: 'ADMIN',
      password: adminPass,
    },
    {
      username: process.env.SEED_USER_USERNAME || 'staff',
      name: 'Staff Gudang',
      role: 'USER',
      password: userPass,
    },
  ];
}

module.exports = { getAccounts };
