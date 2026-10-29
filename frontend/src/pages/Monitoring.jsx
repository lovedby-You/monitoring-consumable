import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  LoaderCircle,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import api, { downloadFile, errorMessage, fmtDate, fmtNum, todayLocal } from '../api/client';
import { DataState } from '@/components/DataState';
import PageHeader from '@/components/PageHeader';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import Segmented from '@/components/Segmented';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

const EXPORTS = [
  {
    format: 'xlsx',
    label: 'Excel (.xlsx)',
    hint: '',
    icon: FileSpreadsheet,
  },
  {
    format: 'pdf',
    label: 'PDF',
    hint: '',
    icon: FileType,
  },
  { format: 'csv', label: 'CSV', hint: '', icon: FileText },
];

const AlertBadge = ({ r }) =>
  r.orderAlert ? (
    <Badge variant="warning">
      <TriangleAlert /> Need order
    </Badge>
  ) : (
    <Badge variant="success">Safe</Badge>
  );

function Metric({ label, value, strong }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('text-sm tabular-nums', strong ? 'font-semibold' : 'font-medium')}>
        {value}
      </p>
    </div>
  );
}

function ItemCard({ r, coverDays }) {
  const [open, setOpen] = useState(false);
  const u = r.unit.toLowerCase();
  return (
    <li className={cn('px-4 py-3.5', r.orderAlert && 'bg-warning-soft/60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{r.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {r.code} · {u}
          </p>
        </div>
        <AlertBadge r={r} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Metric label="Left over" value={fmtNum(r.leftOver)} strong />
        <Metric label="Order point" value={fmtNum(r.orderPoint, 0)} />
        <Metric label={`Qty to order`} value={`${fmtNum(r.quantityToOrder)} ${u}`} strong />
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-primary"
      >
        {open ? 'Sembunyikan detail' : 'Lihat detail'}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 rounded-md bg-muted/60 p-3">
          <Metric label="Carry over" value={fmtNum(r.carryOver)} />
          <Metric label="Total in" value={fmtNum(r.totalIn)} />
          <Metric label="Total out" value={fmtNum(r.totalOut)} />
          <Metric label="Avg usage/hari" value={fmtNum(r.averageUsage, 2)} />
          <Metric label="AWU" value={fmtNum(r.awu, 2)} />
          <Metric label={`LT order`} value={`${r.leadTimeDays} hr`} />
          <Metric label="Max qty" value={fmtNum(r.maxQty)} />
          <Metric label="Min qty" value={fmtNum(r.minQty)} />
          <Metric label="Safety stock" value={fmtNum(r.safetyStock)} />
          <p className="col-span-3 text-[11px] text-muted-foreground">
            Qty to order untuk {coverDays} hari kebutuhan.
          </p>
        </div>
      )}
    </li>
  );
}

export default function Monitoring() {
  const [days, setDays] = useState('30');
  const [leadTime, setLeadTime] = useState(8);
  const [coverDays, setCoverDays] = useState(75);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showParams, setShowParams] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [month, setMonth] = useState(todayLocal().slice(0, 7));
  const [exporting, setExporting] = useState('');

  const load = useCallback(() => {
    const lt = Number(leadTime);
    const cd = Number(coverDays);
    if (!Number.isInteger(lt) || lt < 0 || !Number.isInteger(cd) || cd < 1) return; // tunggu input valid
    setLoading(true);
    setError('');
    api
      .get('/monitoring', { params: { days: Number(days), leadTime: lt, coverDays: cd } })
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [days, leadTime, coverDays]);
  useEffect(() => {
    load();
  }, [load]);

  const doExport = async (format) => {
    setExporting(format);
    try {
      await downloadFile(
        '/monitoring/export',
        { month, format, leadTime: Number(leadTime), coverDays: Number(coverDays) },
        `consumable-report-${month}.${format}`,
      );
      toast.success('Laporan berhasil diunduh', {
        description: `${month} · ${format.toUpperCase()}`,
      });
      setExportOpen(false);
    } catch (e) {
      toast.error('Gagal membuat laporan', { description: errorMessage(e) });
    } finally {
      setExporting('');
    }
  };

  const all = data ? data.data : [];
  const need = all.filter((r) => r.orderAlert);
  const rows = filter === 'need' ? need : all;
  const stickyCell = (alert) =>
    cn(
      'sticky left-0 z-10 min-w-[12rem] border-r',
      alert ? 'bg-[hsl(var(--warning-soft))]' : 'bg-card',
    );
  const num = 'text-right';

  return (
    <>
      <PageHeader
        title="Monitoring stok"
        description={
          data
            ? ``
            : ''
        }
      >
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label="Parameter perhitungan"
          aria-expanded={showParams}
          onClick={() => setShowParams((v) => !v)}
        >
          <SlidersHorizontal />
        </Button>
        <Button onClick={() => setExportOpen(true)}>
          <Download /> Export
        </Button>
      </PageHeader>

      {/* Parameter */}
      <div
        className={cn(
          'mb-4 grid-cols-3 gap-3 rounded-lg border bg-card p-4 md:grid',
          showParams ? 'grid' : 'hidden',
        )}
      >
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Periode usage</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[7, 14, 30, 60, 90].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} hari
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lt" className="text-xs text-muted-foreground">
            Lead time (hari)
          </Label>
          <Input
            id="lt"
            type="number"
            inputMode="numeric"
            min="0"
            max="365"
            value={leadTime}
            onChange={(e) => setLeadTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cd" className="text-xs text-muted-foreground">
            Cakupan order (hari)
          </Label>
          <Input
            id="cd"
            type="number"
            inputMode="numeric"
            min="1"
            max="365"
            value={coverDays}
            onChange={(e) => setCoverDays(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3 md:px-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Semua', count: all.length },
              { value: 'need', label: 'Need order', count: need.length },
            ]}
          />
        </div>

        <DataState
          loading={loading}
          error={error}
          onRetry={load}
          empty={data && rows.length === 0}
          emptyTitle={filter === 'need' ? 'Semua item aman' : 'Belum ada consumable'}
          emptyHint={filter === 'need' ? 'Tidak ada item yang perlu dipesan saat ini.' : undefined}
        >
          {data && (
            <>
              <div className="hidden md:block">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 border-r bg-muted">Item</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className={num}>Carry over</TableHead>
                      <TableHead className={num}>Total in</TableHead>
                      <TableHead className={num}>Total out</TableHead>
                      <TableHead className={num}>Left over</TableHead>
                      <TableHead className={num}>Avg usage</TableHead>
                      <TableHead className={num}>Max qty</TableHead>
                      <TableHead className={num}>Min qty</TableHead>
                      <TableHead className={num}>AWU</TableHead>
                      <TableHead className={num}>Order point</TableHead>
                      <TableHead className={num}>LT order</TableHead>
                      <TableHead className={num}>Safety stock</TableHead>
                      <TableHead>Order alert</TableHead>
                      <TableHead className={num}>Qty to order ({data.coverDays} hr)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id} className={cn(r.orderAlert && 'bg-warning-soft')}>
                        <TableCell className={stickyCell(r.orderAlert)}>
                          <p className="font-medium">{r.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{r.code}</p>
                        </TableCell>
                        <TableCell>{r.unit.toLowerCase()}</TableCell>
                        <TableCell className={num}>{fmtNum(r.carryOver)}</TableCell>
                        <TableCell className={num}>{fmtNum(r.totalIn)}</TableCell>
                        <TableCell className={num}>{fmtNum(r.totalOut)}</TableCell>
                        <TableCell className={cn(num, 'font-semibold')}>
                          {fmtNum(r.leftOver)}
                        </TableCell>
                        <TableCell className={num}>{fmtNum(r.averageUsage, 2)}</TableCell>
                        <TableCell className={num}>{fmtNum(r.maxQty)}</TableCell>
                        <TableCell className={num}>{fmtNum(r.minQty)}</TableCell>
                        <TableCell className={num}>{fmtNum(r.awu, 2)}</TableCell>
                        <TableCell className={num}>{fmtNum(r.orderPoint, 2)}</TableCell>
                        <TableCell className={num}>{r.leadTimeDays}</TableCell>
                        <TableCell className={num}>{fmtNum(r.safetyStock)}</TableCell>
                        <TableCell>
                          <AlertBadge r={r} />
                        </TableCell>
                        <TableCell className={cn(num, 'font-semibold')}>
                          {fmtNum(r.quantityToOrder)} {r.unit.toLowerCase()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y md:hidden">
                {rows.map((r) => (
                  <ItemCard key={r.id} r={r} coverDays={data.coverDays} />
                ))}
              </ul>
              <p className="border-t p-4 text-xs leading-relaxed text-muted-foreground">
              </p>
            </>
          )}
        </DataState>
      </Card>

      <ResponsiveDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export laporan bulanan"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="month">Bulan</Label>
            <Input
              id="month"
              type="month"
              value={month}
              max={todayLocal().slice(0, 7)}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {EXPORTS.map(({ format, label, hint, icon: Icon }) => (
              <button
                key={format}
                type="button"
                disabled={!!exporting}
                onClick={() => doExport(format)}
                className="flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {exporting === format ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
