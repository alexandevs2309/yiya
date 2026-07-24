import { useMemo } from 'react';

export const CHART_SEMANTIC_COLORS = [
  'var(--chart-color-1)',  // Primary - principal
  'var(--chart-color-2)',  // Success - positivo/éxito
  'var(--chart-color-3)',  // Warning - advertencia/pendiente
  'var(--chart-color-4)',  // Destructive - error/negativo
  'var(--chart-color-5)',  // Accent - acento
  'var(--chart-color-6)',  // Muted - neutro
];

export function useChartColors(count?: number) {
  const colors = useMemo(() => {
    const base = CHART_SEMANTIC_COLORS;
    if (!count || count <= base.length) return base.slice(0, count);
    // Si se necesitan más colores, repetir con opacidad reducida
    const extended = [...base];
    while (extended.length < count) {
      extended.push(...base.map((c, i) => `${c}${(i + 1) * 15}%`));
    }
    return extended.slice(0, count);
  }, [count]);

  return colors;
}

export function getChartColor(index: number): string {
  return CHART_SEMANTIC_COLORS[index % CHART_SEMANTIC_COLORS.length];
}
