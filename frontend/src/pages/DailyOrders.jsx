import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { errorMessage, fmtDate, fmtNum, todayLocal } from '../api/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import { DataState } from '@/components/DataState';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DailyOrders() {
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], total: 0, pageSize: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ date: todayLocal(), totalOrders: '' });
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/daily-orders', { params: { page, pageSize: 15 } })
      .then((r) => setRes(r.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [page]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/daily-orders', { date: form.date, totalOrders: Number(form.totalOrders) });
      toast.success('Total order tersimpan', { description: fmtDate(form.date) });
      setForm({ ...form, totalOrders: '' });
      setPage(1);
      load();
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
      await api.delete(`/daily-orders/${id}`);
      toast.success('Data dihapus');
      load();
    } catch (err) {
      toast.error('Gagal menghapus', { description: errorMessage(err) });
    }
  };
  const delBtn = (id) => (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-destructive"
      aria-label="Hapus"
      onClick={() => setToDelete(id)}
    >
      <Trash2 />
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Order hari ini"
      />
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Input total order</CardTitle>
          </CardHeader>
          <form onSubmit={save} className="space-y-4 p-4 pt-0 md:px-5 md:pb-5">
            <div className="space-y-1.5">
              <Label htmlFor="d">Tanggal</Label>
              <Input
                id="d"
                max={todayLocal()}
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t">Total order</Label>
              <Input
                id="t"
                type="number"
                inputMode="numeric"
                min="0"
                className="tabular-nums"
                value={form.totalOrders}
                onChange={(e) => setForm({ ...form, totalOrders: e.target.value })}
                required
              />
            </div>
            <Button size="lg" className="w-full" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" />}
              {saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Riwayat order</CardTitle>
          </CardHeader>
          <DataState
            loading={loading}
            error={error}
            onRetry={load}
            empty={res.data.length === 0}
            emptyTitle="Belum ada data order"
          >
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Total order</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {res.data.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{fmtDate(o.date)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtNum(o.totalOrders)}
                      </TableCell>
                      <TableCell>{delBtn(o.id)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y md:hidden">
              {res.data.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <p className="text-sm font-medium">{fmtDate(o.date)}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-semibold tabular-nums">
                      {fmtNum(o.totalOrders)}
                    </span>
                    {delBtn(o.id)}
                  </div>
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
        title="Hapus data order?"
        description="Data total order pada tanggal ini akan dihapus."
        onConfirm={remove}
      />
    </>
  );
}
