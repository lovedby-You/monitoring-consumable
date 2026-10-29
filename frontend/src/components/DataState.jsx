import { CircleAlert, Inbox, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const PageLoader = () => (
  <div className="flex h-screen items-center justify-center text-primary">
    <LoaderCircle className="h-7 w-7 animate-spin" aria-label="Memuat" />
  </div>
);

const ListSkeleton = ({ rows = 5 }) => (
  <div className="divide-y" aria-busy="true" aria-label="Memuat data">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center justify-between gap-4 px-4 py-3.5">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

const ErrorBox = ({ message, onRetry }) => (
  <div className="m-4 flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-2 text-sm text-destructive">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry}>
        Coba lagi
      </Button>
    )}
  </div>
);

const Empty = ({ title = 'Belum ada data', hint }) => (
  <div className="flex flex-col items-center px-4 py-12 text-center">
    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Inbox className="h-5 w-5" />
    </span>
    <p className="text-sm font-medium">{title}</p>
    {hint && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{hint}</p>}
  </div>
);

// Membungkus state loading / error / kosong / konten
export function DataState({ loading, error, empty, onRetry, emptyTitle, emptyHint, children }) {
  if (loading) return <ListSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;
  if (empty) return <Empty title={emptyTitle} hint={emptyHint} />;
  return children;
}
