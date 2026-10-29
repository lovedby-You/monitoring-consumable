const { ZodError } = require('zod');
const env = require('../config/env');

const notFound = (req, res) =>
  res.status(404).json({ message: `Rute ${req.method} ${req.path} tidak ditemukan` });

const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError)
    return res.status(400).json({ message: 'Validasi gagal', details: err.flatten().fieldErrors });
  if (err.code === 'P2002')
    return res.status(409).json({ message: 'Data duplikat (nilai unik sudah ada)' });
  if (err.code === 'P2003')
    return res.status(409).json({ message: 'Data masih dipakai oleh data lain' });
  if (err.code === 'P2025') return res.status(404).json({ message: 'Data tidak ditemukan' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 && env.isProd ? 'Terjadi kesalahan pada server' : err.message,
    details: err.details,
  });
};
module.exports = { notFound, errorHandler };
