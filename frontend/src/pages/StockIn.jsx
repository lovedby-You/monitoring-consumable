import StockPage from '@/components/StockPage';

const CONFIG = {
  kind: 'IN',
  endpoint: '/stock-in',
  hasPo: true,
  title: 'Penerimaan consumable',
  description: '',
  formTitle: 'Catat penerimaan',
  namePlaceholder: '',
  submit: 'Simpan penerimaan',
  saved: 'Penerimaan tersimpan',
  historyTitle: 'Riwayat penerimaan',
  empty: 'Belum ada penerimaan',
  searchPlaceholder: 'Cari nama atau no. PO…',
};

export default function StockIn() {
  return <StockPage cfg={CONFIG} />;
}
