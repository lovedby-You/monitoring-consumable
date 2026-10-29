import StockPage from '@/components/StockPage';

// Tabel StockOut: tanggal, nama, jenis consumable, quantity
const CONFIG = {
  kind: 'OUT',
  endpoint: '/stock-out',
  hasPo: false,
  title: 'Pengambilan consumable',
  description: '',
  formTitle: 'Catat pengambilan',
  namePlaceholder: '',
  submit: 'Simpan pengambilan',
  saved: 'Pengambilan tersimpan',
  historyTitle: 'Riwayat pengambilan',
  empty: 'Belum ada pengambilan',
  searchPlaceholder: 'Cari nama…',
};

export default function StockOut() {
  return <StockPage cfg={CONFIG} />;
}
