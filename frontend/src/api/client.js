import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1', withCredentials: true });

// Sesi habis / tidak valid: kembali ke halaman login (kecuali permintaan login dan cek sesi awal)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.startsWith('/auth/')) {
      window.location.assign('/login');
    }
    return Promise.reject(err);
  },
);

// Pesan error yang ramah: gabungkan detail validasi bila ada
export function errorMessage(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || 'Terjadi kesalahan jaringan';
  if (Array.isArray(d.details)) return `${d.message}: ${d.details.join('; ')}`;
  if (d.details && typeof d.details === 'object') {
    const parts = Object.entries(d.details).map(([k, v]) => `${k}: ${[].concat(v).join(', ')}`);
    return `${d.message}${parts.length ? ` — ${parts.join('; ')}` : ''}`;
  }
  return d.message || 'Terjadi kesalahan';
}
export default api;

// Unduh file dari endpoint (cookie login ikut terkirim). Error JSON dari server dibaca agar pesannya tampil.
export async function downloadFile(url, params, fallbackName) {
  try {
    const r = await api.get(url, { params, responseType: 'blob' });
    const m = /filename="?([^";]+)"?/.exec(r.headers['content-disposition'] || '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(r.data);
    a.download = m ? m[1] : fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch {
        /* biarkan */
      }
    }
    throw err;
  }
}

export const fmtNum = (n, d = 0) =>
  n == null ? '-' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: d });
export const fmtRp = (n) =>
  n == null
    ? '-'
    : Number(n).toLocaleString('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      });
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
// '2026-10-24' -> '24 Okt 2026' (tanpa konversi zona waktu)
export const fmtDate = (s) => {
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
};
export const todayLocal = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
