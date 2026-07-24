import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { ChartContainer } from './ChartContainer';
import { ChartTooltipContent } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';
import { getChartColor } from './hooks/useChartColors';

export interface BarChartSeries {
  key: string;
  name: string;
  color?: number;
}

export interface BarChartData {
  [key: string]: any;
}

export interface BarChartProps {
  data: BarChartData[];
  labelKey: string;
  series: BarChartSeries[];
  labelFormatter?: (value: any) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  height?: number;
  maxBarSize?: number;
  barRadius?: [number, number, number, number];
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  yAxisFormatter?: (value: number) => string;
  yAxisAllowDecimals?: boolean;
  animationDuration?: number;
  className?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export function BarChart({
  data,
  labelKey,
  series,
  labelFormatter,
  tooltipFormatter,
  height = 250,
  maxBarSize = 24,
  barRadius = [4, 4, 0, 0],
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  yAxisFormatter,
  yAxisAllowDecimals = false,
  animationDuration = 400,
  className = '',
  loading = false,
  error = null,
  emptyMessage = 'Sin datos para mostrar',
}: BarChartProps) {
  if (!data?.length) {
    return (
      <ChartContainer height={height} className={className}>
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      </ChartContainer>
    );
  }

  const legendItems = series.map((s, i) => ({
    value: s.key,
    name: s.name,
    color: s.color !== undefined ? getChartColor(s.color) : getChartColor(i),
  }));

  return (
    <ChartContainer height={height} loading={loading} error={error}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
          layout="vertical"
        >
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={yAxisFormatter}
            allowDecimals={yAxisAllowDecimals}
            allowDataOverflow
          />
          <YAxis
            type="category"
            dataKey={labelKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={labelFormatter}
            width={80}
          />
          <Tooltip
            content={<ChartTooltipContent formatter={tooltipFormatter} />}
            wrapperStyle={{ pointerEvents: 'none' }}
            cursor={false}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              radius={barRadius}
              maxBarSize={maxBarSize}
              fill={s.color !== undefined ? getChartColor(s.color) : getChartColor(i)}
              stackId="a"
              animationDuration={animationDuration}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
      {showLegend && (
        <ChartLegend
          items={legendItems}
          layout="vertical"
          className="mt-4"
        />
      )}
    </ChartContainer>
  );
}

export function HorizontalBarChart({
  data,
  labelKey,
  series,
  labelFormatter,
  tooltipFormatter,
  height = 250,
  maxBarSize = 24,
  barRadius = [0, 4, 4, 0],
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  xAxisFormatter,
  xAxisAllowDecimals = false,
  animationDuration = 400,
  className = '',
  loading = false,
  error = null,
  emptyMessage = 'Sin datos para mostrar',
}: Omit<BarChartProps, 'yAxisFormatter' | 'yAxisAllowDecimals'> & {
  xAxisFormatter?: (value: number) => string;
  xAxisAllowDecimals?: boolean;
}) {
  if (!data?.length) {
    return (
      <ChartContainer height={height} className={className}>
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      </ChartContainer>
    );
  }

  const legendItems = series.map((s, i) => ({
    value: s.key,
    name: s.name,
    color: s.color !== undefined ? getChartColor(s.color) : getChartColor(i),
  }));

  return (
    <ChartContainer height={height} loading={loading} error={error}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          layout="horizontal"
        >
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={xAxisFormatter}
            allowDecimals={xAxisAllowDecimals}
          />
          <YAxis
            type="category"
            dataKey={labelKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={labelFormatter}
            width={80}
          />
          <Tooltip
            content={<ChartTooltipContent />}
            wrapperStyle={{ pointerEvents: 'none' }}
            cursor={false}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              radius={[0, 4, 4, 0]}
              maxBarSize={maxBarSize}
              fill={s.color !== undefined ? getChartColor(s.color) : getChartColor(i)}
              stackId="a"
              animationDuration={animationDuration}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
      {showLegend && (
        <ChartLegend
          items={legendItems}
          layout="vertical"
          className="mt-4"
        />
      )}
    </ChartContainer>
  );
}
