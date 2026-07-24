# Chart Design System — D'Yiya Restaurant's

> Extensión del Design System para visualización de datos. Basado en **Recharts** + **Design Tokens**.

---

## Tokens CSS (`index.css`)

Todos los tokens están definidos en `:root, :root.dark` y se ajustan automáticamente en `:root.light`.

```css
/* Paleta semántica para series de datos */
--chart-color-1: var(--color-primary);       /* Principal */
--chart-color-2: var(--color-success);       /* Éxito/positivo */
--chart-color-3: var(--color-warning);       /* Advertencia/pendiente */
--chart-color-4: var(--color-destructive);   /* Error/negativo */
--chart-color-5: var(--color-accent);        /* Acento */
--chart-color-6: var(--color-muted-foreground); /* Neutro */

/* Dimensiones */
--chart-bar-width: 24px;
--chart-bar-radius: 6px;
--chart-category-gap: 24px;

/* Animación */
--chart-animation-duration: 800ms;
--chart-animation-easing: cubic-bezier(0.4, 0, 0.2, 1);

/* Grid y ejes */
--chart-grid-color: var(--color-border);
--chart-grid-opacity: 0.3;       /* 0.4 en light mode */
--chart-axis-color: var(--color-muted-foreground);
--chart-tick-size: 0;

/* Tooltip */
--chart-tooltip-bg: var(--color-popover);
--chart-tooltip-border: var(--color-border);
--chart-tooltip-radius: var(--radius-md);
--chart-tooltip-padding: 12px 16px;
--chart-tooltip-font-size: 13px;
--chart-tooltip-shadow: var(--shadow-lg);

/* Leyenda */
--chart-legend-gap: 16px;
--chart-legend-item-gap: 8px;
--chart-legend-font-size: 13px;
```

> **Regla:** Nunca usar colores directos (`#ef4444`, `blue-500`, etc.). Siempre `var(--chart-color-*)` o `var(--color-*)`.

---

## Paleta Semántica para Gráficos

| Token | Uso | Barras | Líneas | Pie/Donut |
|-------|-----|--------|--------|-----------|
| `--chart-color-1` → `--color-primary` | Principal, ventas, órdenes | ✅ | ✅ | ✅ |
| `--chart-color-2` → `--color-success` | Éxito, pagado, listo | ✅ | | ✅ |
| `--chart-color-3` → `--color-warning` | Pendiente, en proceso | ✅ | | ✅ |
| `--chart-color-4` → `--color-destructive` | Error, cancelado | ✅ | | ✅ |
| `--chart-color-5` → `--color-accent` | Métrica extra, acento | ✅ | ✅ | ✅ |
| `--chart-color-6` → `--color-muted-foreground` | Neutro, secundario | ✅ | | ✅ |

---

## Componentes Disponibles

```
frontend/src/components/charts/
├── index.ts                    # Exports públicos
├── ChartContainer.tsx          # Wrapper responsive + loading + error states
├── ChartTooltip.tsx            # Tooltip unificado con tokens DS
├── ChartLegend.tsx             # Leyenda horizontal/vertical
├── BarChart.tsx                # BarChart (vertical) + HorizontalBarChart
├── PieChart.tsx                # PieChart + DonutChart (innerRadius > 0)
├── LineChart.tsx               # LineChart + AreaChart
└── hooks/
    └── useChartColors.ts       # Hook + getChartColor() + CHART_SEMANTIC_COLORS
```

### Exports disponibles desde `@/components/charts`

```ts
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  BarChart,
  HorizontalBarChart,
  PieChart,
  DonutChart,
  LineChart,
  AreaChart,
  getChartColor,
  useChartColors,
  CHART_SEMANTIC_COLORS,
} from '@/components/charts'
```

---

## Props Comunes

### BarChart / HorizontalBarChart

```typescript
interface BarChartProps {
  data: Record<string, any>[];
  labelKey: string;                         // Clave categórica (ej: "hour")
  series: Array<{
    key: string;                            // Clave numérica (ej: "orders")
    name: string;                           // Nombre para tooltip/leyenda
    color?: number;                         // Índice en CHART_SEMANTIC_COLORS (0-5)
  }>;
  labelFormatter?: (value: any) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  height?: number;             // default: 250
  maxBarSize?: number;         // default: 24 (rango 20-28)
  barRadius?: [number, number, number, number]; // default: [4,4,0,0]
  showGrid?: boolean;          // default: true
  showLegend?: boolean;        // default: false
  yAxisFormatter?: (value: number) => string;
  animationDuration?: number;  // default: 400
  loading?: boolean;
  error?: string | null;
}
```

### PieChart / DonutChart

```typescript
interface PieChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>;
  nameKey?: string;            // default: "name"
  valueKey?: string;           // default: "value"
  innerRadius?: number;        // 0 = pie, >0 = donut (default PieChart: 60, DonutChart: 70)
  outerRadius?: number;        // default: 90
  height?: number;             // default: 250
  showLegend?: boolean;        // default: true
  legendLayout?: 'horizontal' | 'vertical'; // default: "vertical"
  animationDuration?: number;  // default: 800
  loading?: boolean;
  error?: string | null;
}
```

### LineChart / AreaChart

```typescript
interface LineChartSeries {
  key: string;
  name: string;
  color?: number;              // Índice en CHART_SEMANTIC_COLORS
  type?: 'monotone' | 'natural' | 'linear' | 'step';
  animationDuration?: number;
}
```

### ChartContainer

```typescript
interface ChartContainerProps {
  height?: number;             // default: 250
  className?: string;
  loading?: boolean;           // Muestra spinner centrado
  error?: string | null;       // Muestra estado de error con ícono
  children: React.ReactNode;
}
```

---

## Principios Visuales

| Principio | Especificación |
|-----------|----------------|
| **Barras** | `maxBarSize: 24` (entre 20-28px), `radius={[4,4,0,0]}` |
| **Grid** | `stroke="var(--color-border)"`, `strokeDasharray="4 4"`, opacidad 0.3 |
| **Ejes** | Sin `axisLine`, sin `tickLine`, ticks 11px, color `var(--color-muted-foreground)` |
| **Tooltips** | Componente `ChartTooltipContent`, tokens semánticos |
| **Dark/Light** | Tokens CSS resuelven automáticamente |
| **Animaciones** | 400ms `ease-out` en barras/líneas, 800ms en pie/donut |
| **Responsive** | `ResponsiveContainer width="100%"` en todos los gráficos |

---

## Ejemplos de Uso

### Barras (órdenes por hora)

```tsx
import { BarChart } from '@/components/charts'

<BarChart
  data={hourlyOrders}
  labelKey="hour"
  series={[{ key: 'orders', name: 'Órdenes' }]}
  height={250}
  labelFormatter={(h) => `${h}:00`}
  tooltipFormatter={(v) => [`${v} órdenes`, 'Cantidad']}
/>
```

### Donut (métodos de pago)

```tsx
import { PieChart } from '@/components/charts'

<PieChart
  data={paymentMethods}
  nameKey="name"
  valueKey="value"
  innerRadius={60}
  outerRadius={90}
  height={250}
  showLegend
  legendLayout="vertical"
/>
```

### Con estado de carga

```tsx
<BarChart
  data={data}
  labelKey="hour"
  series={[{ key: 'orders', name: 'Órdenes' }]}
  loading={isLoading}
  error={error ? 'Error al cargar datos' : null}
/>
```

---

## Checklist de Cumplimiento (Definition of Done)

- [ ] Usa solo `var(--chart-color-*)` o `var(--color-*)` — nunca hex/rgb directos
- [ ] `maxBarSize` entre 20-28px
- [ ] `radius={[4,4,0,0]}` en barras verticales, `[0,4,4,0]` en horizontales
- [ ] Grid con `var(--color-border)` + dasharray
- [ ] Ejes sin `axisLine`, ticks 11px, color muted
- [ ] Tooltip usa `ChartTooltipContent`
- [ ] Envuelto en `ChartContainer` con `loading` y `error`
- [ ] Funciona en Light y Dark mode (verificar manualmente)
- [ ] Responsive (`ResponsiveContainer width="100%"`)
- [ ] TypeScript strict, sin `any` innecesario

---

## Uso en Producción

| Página | Componente | Datos |
|--------|-----------|-------|
| `dashboard.tsx` | `BarChart` | `DashboardData.hourly_orders` |
| `reports.tsx` | `BarChart` | `DashboardData.hourly_orders` |
| `reports.tsx` | `PieChart` | `DashboardData.payment_methods` |

---

## Referencias

- [Design Tokens](./design-tokens.md)
- [Colors](./colors.md)
- [Animations](./animations.md)
- [Recharts API](https://recharts.org/en-US/api)
