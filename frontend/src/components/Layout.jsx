import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Boxes,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PackageMinus,
  PackagePlus,
  ShoppingBag,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const GROUPS = [
  {
    label: 'Operasional',
    items: [
      { to: '/', label: 'Dashboard', short: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/penerimaan', label: 'Penerimaan', short: 'Penerimaan', icon: PackagePlus },
      { to: '/pengambilan', label: 'Pengambilan', short: 'Pengambilan', icon: PackageMinus },
      { to: '/order-hari-ini', label: 'Order Hari Ini', short:"Order Hari Ini", icon: ShoppingBag, admin: true },
    ],
  },
  {
    label: 'Monitoring',
    admin: true,
    items: [{ to: '/monitoring', label: 'Monitoring Stok', icon: Activity }],
  },
  {
    label: 'Master data',
    admin: true,
    items: [{ to: '/consumables', label: 'Master Consumable', icon: Boxes }],
  },
];

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
const today = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
}).format(new Date());

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Warehouse className="h-4 w-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        Monitoring <span className="text-primary">Consumable</span>
      </span>
    </div>
  );
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const [more, setMore] = useState(false);
  const nav = useNavigate();
  const { pathname } = useLocation();
  // sembunyikan grup dan item khusus admin untuk user biasa
  const groups = GROUPS.filter((g) => !g.admin || isAdmin).map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.admin || isAdmin),
  }));
  const bottom = groups.flatMap((g) => g.items).filter((i) => i.short);
  const moreItems = groups.flatMap((g) => g.items).filter((i) => !i.short);
  const moreActive = moreItems.some((i) => pathname.startsWith(i.to));
  const doLogout = async () => {
    await logout();
    nav('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand />
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {g.label}
              </p>
              {g.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                      isActive &&
                        'bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur md:px-6">
          <div className="lg:hidden">
            <Brand />
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">{today}</p>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-md p-1 pr-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Menu pengguna"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(user.name)}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-medium">{user.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {user.role === 'ADMIN' ? 'Admin' : 'User'}
                </span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <span className="block font-medium">{user.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {user.username} · {user.role === 'ADMIN' ? 'Admin' : 'User'}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={doLogout}>
                <LogOut /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-24 md:px-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Navigasi bawah (HP & tablet) */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${bottom.length + (moreItems.length ? 1 : 0)}, minmax(0, 1fr))`,
          }}
        >
          {bottom.map(({ to, short, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground',
                    isActive && 'text-primary',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {short}
              </NavLink>
            </li>
          ))}
          {moreItems.length > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setMore(true)}
                className={cn(
                  'flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground',
                  moreActive && 'text-primary',
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                Lainnya
              </button>
            </li>
          )}
        </ul>
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
          <SheetTitle className="mb-2 px-2">Menu lainnya</SheetTitle>
          <SheetDescription className="sr-only">Menu master data</SheetDescription>
          {moreItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMore(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-3.5 text-base hover:bg-muted',
                  isActive && 'bg-primary/10 font-medium text-primary',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </SheetContent>
      </Sheet>
    </div>
  );
}
