import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api, { errorMessage, fmtDate, fmtNum, fmtRp } from '../api/client';
import { DataState } from '@/components/DataState';
import PageHeader from '@/components/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function Kpi({ label, value, sub }) {
  return (
    <div className="bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold tabular-nums tracking-tight sm:text-2xl">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/dashboard')
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Dashboard"
      />
      <DataState
        loading={loading}
        error={error}
        onRetry={load}
        empty={data && data.perItem.length === 0}
        emptyTitle="Belum ada consumable"
        emptyHint="Admin dapat menambahkan item di Master Consumable."
      >
        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
              <Kpi
                label="Total in hari ini"
                value={fmtNum(data.summary.totalInToday)}
              />
              <Kpi
                label="Total out hari ini"
                value={fmtNum(data.summary.totalOutToday)}
              />
              <Kpi
                label="Nilai inventory"
                value={fmtRp(data.summary.inventoryValue)}
              />
              <Kpi
                label="Order hari ini"
                value={fmtNum(data.summary.ordersToday)}
                sub={
                  data.summary.usagePerOrderTotal != null
                    ? `Usage per order ${fmtNum(data.summary.usagePerOrderTotal, 2)}`
                    : ''
                }
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Order vs total usage</CardTitle>
                <p className="text-sm text-muted-foreground">Satu bulan terakhir</p>
              </CardHeader>
              <div className="h-60 px-2 pb-3 sm:h-72 sm:px-4">
                <ResponsiveContainer>
                  <ComposedChart
                    data={data.chart}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="hsl(214 22% 89%)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => d.slice(8)}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip
                      labelFormatter={fmtDate}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid hsl(214 22% 89%)',
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                    />
                    <Bar
                      dataKey="orders"
                      name="Order"
                      fill="hsl(221 76% 46%)"
                      fillOpacity={0.85}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalUsage"
                      name="Total usage"
                      stroke="hsl(38 95% 48%)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stok dan pergerakan hari ini</CardTitle>
              </CardHeader>
              {/* Tabel: layar lebar */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">IN</TableHead>
                      <TableHead className="text-right">OUT</TableHead>
                      <TableHead className="text-right">Usage / order</TableHead>
                      <TableHead className="text-right">Stok</TableHead>
                      <TableHead className="text-right">Nilai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.perItem.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{r.code}</p>
                        </TableCell>
                        <TableCell>{r.unit.toLowerCase()}</TableCell>
                        <TableCell className="text-right">
                          {r.totalInToday ? (
                            <span className="text-success">+{fmtNum(r.totalInToday)}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.totalOutToday ? (
                            fmtNum(r.totalOutToday)
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.usagePerOrder != null ? fmtNum(r.usagePerOrder, 2) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fmtNum(r.stock)}
                        </TableCell>
                        <TableCell className="text-right">{fmtRp(r.stockValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Daftar: HP */}
              <ul className="divide-y border-t md:hidden">
                {data.perItem.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {r.code} · {r.unit.toLowerCase()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">{fmtNum(r.stock)}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        <span className={r.totalInToday ? 'text-success' : ''}>
                          IN {fmtNum(r.totalInToday)}
                        </span>{' '}
                        · OUT {fmtNum(r.totalOutToday)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </DataState>
    </>
  );
}
