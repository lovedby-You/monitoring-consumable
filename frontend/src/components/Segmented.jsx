import { cn } from '@/lib/utils';

export default function Segmented({ value, onChange, options, className }) {
  return (
    <div role="tablist" className={cn('inline-flex rounded-md bg-muted p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded px-3 py-2 text-sm font-medium text-muted-foreground transition-colors md:py-1',
            value === o.value && 'bg-card text-foreground shadow-sm',
          )}
        >
          {o.label}
          {o.count != null && (
            <span className="ml-1.5 text-xs tabular-nums opacity-70">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
