import { cn } from '@/lib/utils';

interface LegendItem {
  value: string | number;
  name: string;
  color: string;
}

interface ChartLegendProps {
  items: LegendItem[];
  layout?: 'horizontal' | 'vertical';
  className?: string;
  formatter?: (value: string | number, name: string) => [string, string];
  showValue?: boolean;
}

export function ChartLegend({
  items,
  layout = 'horizontal',
  className = '',
  formatter,
  showValue = true,
}: ChartLegendProps) {
  if (!items?.length) return null;

  return (
    <div
      className={cn(
        'flex gap-3',
        layout === 'horizontal' ? 'flex-wrap justify-center' : 'flex-col items-start gap-2',
        className
      )}
    >
      {items.map((item, i) => {
        const [formattedValue, unit] = formatter
          ? formatter(item.value, item.name)
          : [String(item.value), ''];

        return (
          <div key={item.name ?? i} className={cn('flex items-center gap-1.5', layout === 'horizontal' && 'whitespace-nowrap')}>
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>
              {item.name}
            </span>
            {showValue && (
              <span className="font-mono tabular-nums font-semibold text-xs">
                {formattedValue}{unit && <span className="font-normal text-muted-foreground ml-0.5">{unit}</span>}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
