import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { fmtNum } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Pemilih item dengan pencarian (kode / nama) dan info stok
export default function ItemPicker({ items, value, onChange, id, placeholder = 'Pilih item…' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = items.find((i) => String(i.id) === String(value));
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => `${i.code} ${i.name}`.toLowerCase().includes(s)) : items;
  }, [items, q]);
  const pick = (i) => {
    onChange(String(i.id));
    setOpen(false);
    setQ('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:text-sm"
        >
          {selected ? (
            <span className="min-w-0 truncate">
              <span className="mr-2 font-mono text-xs text-muted-foreground">{selected.code}</span>
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <div className="relative border-b p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus={items.length > 8}
            className="pl-8"
            placeholder="Cari kode atau nama…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && list[0]) {
                e.preventDefault();
                pick(list[0]);
              }
            }}
          />
        </div>
        <ul role="listbox" className="max-h-64 overflow-y-auto p-1">
          {list.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Item tidak ditemukan
            </li>
          )}
          {list.map((i) => {
            const active = String(i.id) === String(value);
            return (
              <li key={i.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(i)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted md:py-2',
                    active && 'bg-muted',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {i.code} · {i.unit.toLowerCase()}
                    </p>
                  </div>
                  {i.stock != null && (
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Stok</p>
                      <p className="text-sm font-medium tabular-nums">{fmtNum(i.stock)}</p>
                    </div>
                  )}
                  <Check className={cn('h-4 w-4 shrink-0 text-primary', !active && 'invisible')} />
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
