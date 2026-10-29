import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { errorMessage, fmtDate, fmtNum, todayLocal } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import { DataState } from '@/components/DataState';
import ItemPicker from '@/components/ItemPicker';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const blank = () => ({ date: todayLocal(), name: '', poNumber: '', consumableId: '', qty: '' });

export default function StockPage({ cfg }) {
  const { isAdmin } = useAuth();
  const isIn = cfg.kind === 'IN';
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ consumableId: '', from: '', to: '', q: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], total: 0, pageSize: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const loadItems = useCallback(() => {
    api
      .get('/consumables', { params: { all: 'true' } })
      .then((r) => setItems(r.data.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = {
      page,
      pageSize: 15,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    };
    api
      .get(cfg.endpoint, { params })
      .then((r) => setRes(r.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [cfg.endpoint, page, filters]);
  useEffect(() => {
    load();
  }, [load]);

  const selected = items.find((i) => String(i.id) === String(form.consumableId));
  const qty = Number(form.qty);
  const hasStock = selected && selected.stock != null;
  const overStock = !isIn && hasStock && qty > selected.stock;
  const stockAfter = hasStock && qty > 0 ? selected.stock + (isIn ? qty : -qty) : null;
  const unit = selected ? selected.unit.toLowerCase() : '';

  const submit = async (e) => {
    e.preventDefault();
    if (!form.consumableId) return toast.error('Pilih jenis consumable terlebih dahulu');
    if (overStock) return toast.error('Quantity melebihi stok tersedia');
    setSaving(true);
    try {
      const body = {
        date: form.date,
        name: form.name,
        consumableId: Number(form.consumableId),
        qty,
        ...(cfg.hasPo ? { poNumber: form.poNumber } : {}),
      };
      const r = await api.post(cfg.endpoint, body);
      toast.success(cfg.saved, {
        description: `Stok sekarang ${fmtNum(r.data.stockAfter)} ${unit}`,
      });
      setForm({ ...blank(), date: form.date });
      setPage(1);
      load();
      loadItems();
    } catch (err) {
      toast.error('Gagal menyimpan', { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    const id = toDelete;
    setToDelete(null);
    try {
      await api.delete(`${cfg.endpoint}/${id}`);
      toast.success('Transaksi dihapus');
      load();
      loadItems();
    } catch (err) {
      toast.error('Gagal menghapus', { description: errorMessage(err) });
    }
  };
  const setF = (k) => (v) => {
    setFilters({ ...filters, [k]: v });
    setPage(1);
  };
  const qtyText = (m) => `${isIn ? '+' : '−'}${fmtNum(m.qty)} ${m.consumable.unit.toLowerCase()}`;
  const qtyClass = isIn ? 'text-success' : 'text-foreground';
  const delBtn = (id, cls) => (
    <Button
      variant="ghost"
      size="icon"
      className={cn('text-muted-foreground hover:text-destructive', cls)}
      aria-label="Hapus transaksi"
      onClick={() => setToDelete(id)}
    >
      <Trash2 />
    </Button>
  );

  return (
    <>
      <PageHeader title={cfg.title} description={cfg.description} />
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        {/* Form */}
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>{cfg.formTitle}</CardTitle>
          </CardHeader>
          <form onSubmit={submit} className="space-y-4 p-4 pt-0 md:px-5 md:pb-5">
            <div className="space-y-1.5">
              <Label htmlFor="item">Jenis consumable</Label>
              <ItemPicker
                id="item"
                items={items}
                value={form.consumableId}
                onChange={(v) => setForm({ ...form, consumableId: v })}
              />
              {hasStock && (
                <p className="text-sm text-muted-foreground">
                  {isIn ? 'Stok saat ini' : 'Stok tersedia'}:{' '}
                  <span className="font-medium tabular-nums text-foreground">
                    {fmtNum(selected.stock)} {unit}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantity</Label>
              <div className="relative">
                <Input
                  id="qty"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  className={cn(
                    'pr-14 tabular-nums',
                    overStock && 'border-destructive focus-visible:ring-destructive',
                  )}
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                  required
                />
                {unit && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {unit}
                  </span>
                )}
              </div>
              {overStock ? (
                <p className="text-sm text-destructive">
                  Melebihi stok tersedia ({fmtNum(selected.stock)} {unit}).
                </p>
              ) : stockAfter != null ? (
                <p className="text-sm text-muted-foreground">
                  Stok setelah transaksi:{' '}
                  <span className="font-medium tabular-nums text-foreground">
                    {fmtNum(stockAfter)} {unit}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                maxLength={150}
                placeholder={cfg.namePlaceholder}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            {cfg.hasPo && (
              <div className="space-y-1.5">
                <Label htmlFor="po">No. PO</Label>
                <Input
                  id="po"
                  maxLength={80}
                  className="font-mono"
                  value={form.poNumber}
                  onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="date">Tanggal</Label>
              <Input
                id="date"
                type="date"
                max={todayLocal()}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <Button size="lg" className="w-full" disabled={saving || overStock}>
              {saving && <LoaderCircle className="animate-spin" />}
              {saving ? 'Menyimpan…' : cfg.submit}
            </Button>
          </form>
        </Card>

        {/* Riwayat */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle>{cfg.historyTitle}</CardTitle>
          </CardHeader>
          <div className="space-y-2 border-b px-4 pb-3 md:px-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={cfg.searchPlaceholder}
                  value={filters.q}
                  onChange={(e) => setF('q')(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Filter"
                aria-expanded={showFilters}
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal />
              </Button>
            </div>
            <div
              className={cn(
                'gap-2 md:grid md:grid-cols-[1fr_9rem_9rem]',
                showFilters ? 'grid grid-cols-2' : 'hidden',
              )}
            >
              <div className="col-span-2 md:col-span-1">
                <Select
                  value={filters.consumableId || 'all'}
                  onValueChange={(v) => setF('consumableId')(v === 'all' ? '' : v)}
                >
                  <SelectTrigger aria-label="Filter jenis consumable">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua jenis consumable</SelectItem>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.code} — {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="date"
                aria-label="Dari tanggal"
                value={filters.from}
                onChange={(e) => setF('from')(e.target.value)}
              />
              <Input
                type="date"
                aria-label="Sampai tanggal"
                value={filters.to}
                onChange={(e) => setF('to')(e.target.value)}
              />
            </div>
          </div>

          <DataState
            loading={loading}
            error={error}
            onRetry={load}
            empty={res.data.length === 0}
            emptyTitle={cfg.empty}
            emptyHint="Ubah filter atau catat transaksi baru."
          >
            {/* Tabel: layar lebar */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama</TableHead>
                    {cfg.hasPo && <TableHead>No. PO</TableHead>}
                    <TableHead>Jenis consumable</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    {isAdmin && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {res.data.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap">{fmtDate(m.date)}</TableCell>
                      <TableCell className="max-w-[14rem] truncate">{m.name}</TableCell>
                      {cfg.hasPo && (
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          {m.poNumber || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                      )}
                      <TableCell>
                        <p className="font-medium">{m.consumable.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {m.consumable.code}
                        </p>
                      </TableCell>
                      <TableCell
                        className={cn('whitespace-nowrap text-right font-medium', qtyClass)}
                      >
                        {qtyText(m)}
                      </TableCell>
                      {isAdmin && <TableCell>{delBtn(m.id)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Daftar: HP */}
            <ul className="divide-y md:hidden">
              {res.data.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.consumable.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{m.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmtDate(m.date)}
                      {cfg.hasPo && m.poNumber ? (
                        <>
                          {' '}
                          · <span className="font-mono">{m.poNumber}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className={cn('shrink-0 text-sm font-semibold tabular-nums', qtyClass)}>
                    {qtyText(m)}
                  </p>
                  {isAdmin && delBtn(m.id, '-my-1 -mr-2')}
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={res.pageSize || 15}
              total={res.total}
              onChange={setPage}
            />
          </DataState>
        </Card>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Hapus transaksi?"
        description="Transaksi akan dihapus dan stok dihitung ulang. Penghapusan penerimaan ditolak bila membuat stok menjadi negatif."
        onConfirm={remove}
      />
    </>
  );
}
