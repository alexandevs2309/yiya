import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from './ChartContainer';
import { ChartTooltipContent } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';
import { getChartColor } from './hooks/useChartColors';

export interface PieChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface PieChartProps {
  data: PieChartData[];
  nameKey?: string;
  valueKey?: string;
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
  paddingAngle?: number;
  startAngle?: number;
  endAngle?: number;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  showLegend?: boolean;
  legendLayout?: 'horizontal' | 'vertical';
  animationDuration?: number;
  className?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export function PieChart({
  data,
  nameKey = 'name',
  valueKey = 'value',
  innerRadius = 60,
  outerRadius = 90,
  height = 250,
  paddingAngle = 3,
  startAngle = 0,
  endAngle = 360,
  tooltipFormatter,
  showLegend = true,
  legendLayout = 'vertical',
  animationDuration = 800,
  className = '',
  loading = false,
  error = null,
  emptyMessage = 'Sin datos para mostrar',
}: PieChartProps) {
  if (!data?.length) {
    return (
      <ChartContainer height={height} className={className}>
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      </ChartContainer>
    );
  }

  const legendItems = data.map((d, i) => ({
    value: d[valueKey],
    name: d[nameKey],
    color: getChartColor(i),
  }));

  return (
    <ChartContainer height={height} className={className} loading={loading} error={error}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            nameKey={nameKey}
            dataKey={valueKey}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={paddingAngle}
            startAngle={startAngle}
            endAngle={endAngle}
            label={({ name, percent }) => percent && percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
            labelLine={false}
            animationDuration={animationDuration}
            animationEasing="ease-out"
          >
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={getChartColor(i)} />
            ))}
            <Tooltip
              content={<ChartTooltipContent formatter={tooltipFormatter} />}
              wrapperStyle={{ pointerEvents: 'none' }}
            />
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
      {showLegend && (
        <ChartLegend
          items={legendItems}
          layout={legendLayout}
          className="mt-4"
        />
      )}
    </ChartContainer>
  );
}

export function DonutChart({
  data,
  nameKey = 'name',
  valueKey = 'value',
  innerRadius = 70,
  outerRadius = 90,
  height = 250,
  paddingAngle = 2,
  tooltipFormatter,
  showLegend = true,
  legendLayout = 'vertical',
  animationDuration = 800,
  className = '',
  loading = false,
  error = null,
  emptyMessage = 'Sin datos para mostrar',
}: Omit<PieChartProps, 'innerRadius' | 'outerRadius'> & { innerRadius?: number; outerRadius?: number }) {
  return (
    <PieChart
      data={data}
      nameKey={nameKey}
      valueKey={valueKey}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      height={height}
      paddingAngle={paddingAngle}
      tooltipFormatter={tooltipFormatter}
      showLegend={showLegend}
      legendLayout={legendLayout}
      animationDuration={animationDuration}
      className={className}
      loading={loading}
      error={error}
      emptyMessage={emptyMessage}
    />
  );
}
