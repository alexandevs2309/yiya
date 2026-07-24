import { cn } from '@/lib/utils';

export interface ChartTooltipProps {
  formatter?: (value: number, name: string) => [string, string];
  label?: string;
  payload?: Array<{ value: number; name: string; color: string; dataKey?: string }>;
  labelFormatter?: (label: any) => string;
}

export function ChartTooltipContent({
  formatter,
  label,
  payload,
  labelFormatter,
}: ChartTooltipProps) {
  if (!payload || payload.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-md shadow-lg border',
        'bg-popover border-border',
        'text-popover-foreground',
        'px-3 py-2',
        'text-sm',
        'font-mono tabular-nums'
      )}
      style={{
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        background: 'var(--color-popover)',
        borderColor: 'var(--color-border)',
      }}
    >
      {label && (
        <p
          className="font-medium mb-1"
          style={{ color: 'var(--color-popover-foreground)' }}
        >
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const [formattedValue, formattedName] = formatter
            ? formatter(entry.value, entry.name)
            : [`${entry.value?.toLocaleString?.() ?? entry.value}`, entry.name];

          return (
            <div
              key={entry.dataKey ?? entry.name ?? i}
              className="flex items-center gap-2"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span
                className="text-muted-foreground flex-1 truncate"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                {formattedName ?? entry.name}
              </span>
              <span
                className="font-medium flex-shrink-0"
                style={{ color: 'var(--color-popover-foreground)' }}
              >
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
