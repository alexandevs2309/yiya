import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { ChartContainer } from './ChartContainer';
import { ChartTooltipContent } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';
import { getChartColor } from './hooks/useChartColors';

export interface LineChartSeries {
  animationDuration?: number;
  key: string;
  name: string;
  color?: number;
  type?: 'monotone' | 'natural' | 'linear' | 'step' | 'stepAfter' | 'stepBefore';
  dot?: boolean;
  strokeWidth?: number;
}

export interface LineChartData {
  [key: string]: any;
}

export interface LineChartProps {
  data: LineChartData[];
  labelKey: string;
  series: LineChartSeries[];
  labelFormatter?: (value: any) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  yAxisFormatter?: (value: number) => string;
  yAxisAllowDecimals?: boolean;
  xAxisType?: 'category' | 'number';
  className?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export function LineChart({
  data,
  labelKey,
  series,
  labelFormatter,
  tooltipFormatter,
  height = 250,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  yAxisFormatter,
  yAxisAllowDecimals = false,
  xAxisType = 'category',
  className = '',
  loading = false,
  error = null,
  emptyMessage = 'Sin datos para mostrar',
}: LineChartProps) {
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
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <XAxis
            type="category"
            dataKey={labelKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={labelFormatter}
            interval={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={yAxisFormatter}
            allowDecimals={false}
          />
          <Tooltip
            content={<ChartTooltipContent />}
            wrapperStyle={{ pointerEvents: 'none' }}
            cursor={false}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name}
              type="monotone"
              stroke={s.color !== undefined ? getChartColor(s.color) : getChartColor(i)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2 }}
              connectNulls
              animationDuration={s.animationDuration}
            />
          ))}
        </RechartsLineChart>
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

export function AreaChart({
  data,
  labelKey,
  series,
  labelFormatter,
  tooltipFormatter,
  height = 250,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  yAxisFormatter,
  className = '',
  loading = false,
  error = null,
  emptyMessage = 'Sin datos para mostrar',
}: Omit<LineChartProps, 'series'> & {
  series: Omit<LineChartSeries, 'type' | 'dot' | 'strokeWidth' | 'animationDuration'>[];
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
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <XAxis
            type="category"
            dataKey={labelKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={labelFormatter}
            interval={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={yAxisFormatter}
            allowDecimals={false}
          />
          <Tooltip
            content={<ChartTooltipContent />}
            wrapperStyle={{ pointerEvents: 'none' }}
            cursor={false}
          />
          {series.map((s, i) => {
            const color = s.color !== undefined ? getChartColor(s.color) : getChartColor(i);
            return (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                type="monotone"
                stroke={color}
                strokeWidth={2}
                fill={color}
                fillOpacity={0.15}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, fill: color }}
                connectNulls
                animationDuration={800}
              />
            );
          })}
        </RechartsLineChart>
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
