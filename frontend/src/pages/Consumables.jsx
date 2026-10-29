import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { errorMessage, fmtNum, fmtRp } from '../api/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import { DataState } from '@/components/DataState';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// Master hanya menyimpan 5 data dasar; metrik lain dihitung otomatis di menu Monitoring.
const blank = { code: '', name: '', unit: 'PCS', initialStock: 0, unitCost: 0, isActive: true };

function RowMenu({ onEdit, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Aksi">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> Ubah
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 /> Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Consumables() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], total: 0, pageSize: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | {id?, ...fields}
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/consumables', {
        params: { page, pageSize: 15, q: q || undefined, includeInactive: 'true' },
      })
      .then((r) => setRes(r.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [page, q]);
  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (c) => {
    setFormErr('');
    setEditing({ ...c });
  };
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErr('');
    const { id, code, name, unit, isActive } = editing;
    const body = {
      code,
      name,
      unit,
      isActive,
      initialStock: Number(editing.initialStock),
      unitCost: Number(editing.unitCost),
    };
    try {
      if (id) await api.put(`/consumables/${id}`, body);
      else await api.post('/consumables', body);
      toast.success(id ? 'Consumable diperbarui' : 'Consumable ditambahkan');
      setEditing(null);
      load();
    } catch (err) {
      setFormErr(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    const c = toDelete;
    setToDelete(null);
    try {
      await api.delete(`/consumables/${c.id}`);
      toast.success(`${c.name} dihapus`);
      load();
    } catch (err) {
      toast.error('Gagal menghapus', { description: errorMessage(err) });
    }
  };
  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.value });
  const status = (c) => (
    <Badge variant={c.isActive ? 'success' : 'muted'}>{c.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
  );

  return (
    <>
      <PageHeader
        title="Master consumable"
      >
        <Button
          onClick={() => {
            setFormErr('');
            setEditing({ ...blank });
          }}
        >
          <Plus /> Tambah item
        </Button>
      </PageHeader>
      <Card className="overflow-hidden">
        <div className="border-b p-4 md:px-5">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari kode atau nama…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <DataState
          loading={loading}
          error={error}
          onRetry={load}
          empty={res.data.length === 0}
          emptyTitle="Belum ada consumable"
          emptyHint="Klik “Tambah item” untuk membuat item pertama."
        >
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Stok saat ini</TableHead>
                  <TableHead className="text-right">Initial stock</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {res.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
                    </TableCell>
                    <TableCell>{c.unit.toLowerCase()}</TableCell>
                    <TableCell className="text-right font-medium">
                      {c.stock != null ? fmtNum(c.stock) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fmtNum(c.initialStock)}
                    </TableCell>
                    <TableCell className="text-right">{fmtRp(c.unitCost)}</TableCell>
                    <TableCell>{status(c)}</TableCell>
                    <TableCell>
                      <RowMenu onEdit={() => openEdit(c)} onDelete={() => setToDelete(c)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y md:hidden">
            {res.data.map((c) => (
              <li key={c.id} className="flex items-center gap-1 pr-2">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pl-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {c.code} · {c.unit.toLowerCase()}
                    </p>
                    <div className="mt-1.5">{status(c)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {c.stock != null ? fmtNum(c.stock) : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">stok</p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {fmtRp(c.unitCost)}
                    </p>
                  </div>
                </button>
                <RowMenu onEdit={() => openEdit(c)} onDelete={() => setToDelete(c)} />
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

      <ResponsiveDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.id ? 'Ubah consumable' : 'Tambah consumable'}
      >
        {editing && (
          <form onSubmit={save} className="grid gap-4">
            {formErr && (
              <Alert variant="destructive">
                <AlertDescription>{formErr}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Kode</Label>
                <Input
                  id="code"
                  className="font-mono"
                  autoCapitalize="characters"
                  value={editing.code}
                  onChange={set('code')}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={editing.unit}
                  onValueChange={(v) => setEditing({ ...editing, unit: v })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PCS">pcs</SelectItem>
                    <SelectItem value="ROLL">roll</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Nama item</Label>
                <Input id="name" value={editing.name} onChange={set('name')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="init">Initial stock</Label>
                <Input
                  id="init"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  className="tabular-nums"
                  value={editing.initialStock}
                  onChange={set('initialStock')}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Unit cost (Rp)</Label>
                <Input
                  id="cost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className="tabular-nums"
                  value={editing.unitCost}
                  onChange={set('unitCost')}
                  required
                />
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="active"
                className="mt-0.5"
                checked={editing.isActive}
                onCheckedChange={(v) => setEditing({ ...editing, isActive: v === true })}
              />
              <div>
                <Label htmlFor="active">Item aktif</Label>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Item nonaktif tidak muncul di form transaksi, dashboard, dan monitoring.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button disabled={saving}>
                {saving && <LoaderCircle className="animate-spin" />}
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </form>
        )}
      </ResponsiveDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Hapus ${toDelete?.name ?? 'item'}?`}
        description="Item yang sudah punya transaksi tidak bisa dihapus; nonaktifkan saja lewat menu Ubah."
        onConfirm={remove}
      />
    </>
  );
}
