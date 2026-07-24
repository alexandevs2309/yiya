# Spacing — D'Yiya Restaurant's Design System

## Escala

| Token | Rem | Pixels | Uso |
|-------|-----|--------|-----|
| `--spacing-0` | 0 | 0 | Sin espacio |
| `--spacing-0.5` | 0.125rem | 2px | Micro-espaciado, separación de iconos |
| `--spacing-1` | 0.25rem | 4px | Compacto, gap entre elementos pequeños |
| `--spacing-1.5` | 0.375rem | 6px | Gap fino en formularios |
| `--spacing-2` | 0.5rem | 8px | Espaciado estándar entre elementos |
| `--spacing-2.5` | 0.625rem | 10px | Padding compacto (badges) |
| `--spacing-3` | 0.75rem | 12px | Padding interno de inputs, celdas |
| `--spacing-3.5` | 0.875rem | 14px | Transición entre 3 y 4 |
| `--spacing-4` | 1rem | 16px | Padding de cards, gap de grids |
| `--spacing-5` | 1.25rem | 20px | Espaciado de secciones internas |
| `--spacing-6` | 1.5rem | 24px | Padding de card-header |
| `--spacing-8` | 2rem | 32px | Gap entre secciones grandes |
| `--spacing-10` | 2.5rem | 40px | Espaciado de página |
| `--spacing-12` | 3rem | 48px | Separación de bloques |
| `--spacing-16` | 4rem | 64px | Secciones mayores |
| `--spacing-20` | 5rem | 80px | Empty states |
| `--spacing-24` | 6rem | 96px | Máxima separación |

## Patrones de Espaciado

### Página
- Page root `space-y-6` (`--spacing-6`) entre secciones principales
- Page padding: `p-8` (`--spacing-8`)
- Módulo active: `space-y-6` entre cards principales

### Card
- `CardHeader`: `p-6` (`--spacing-6`)
- `CardContent`: `p-6 pt-0` (hereda p-6 de header, quita top)
- `CardFooter`: `p-6 pt-0`
- Entre cards en un grid: `gap-4` (`--spacing-4`)

### Formulario
- Entre campos: `space-y-4` (`--spacing-4`)
- Label a input: `mb-1` (`--spacing-1`)
- Entre grupos de formulario: `space-y-6` (`--spacing-6`)
- Input padding: `px-3 py-2` (`--spacing-3` x, `--spacing-2` y)

### Tabla
- Table header cell: `p-3` (`--spacing-3`)
- Table body cell: `p-3` (`--spacing-3`)
- Entre filas: `border-b` (sin espacio extra)

### Botón
- Button default: `h-9 px-4 py-2` (36px alto, `--spacing-4` horizontal, `--spacing-2` vertical)
- Button sm: `h-8 px-3` (32px alto, `--spacing-3` horizontal)
- Button lg: `h-10 px-6` (40px alto, `--spacing-6` horizontal)
- Icon gap: `gap-2` (`--spacing-2`)

### Grid
- POS menu grid: `gap-3` (`--spacing-3`)
- Dashboard cards: `gap-4` (`--spacing-4`)
- KDS order grid: `gap-4` (`--spacing-4`)
- Stats row: `gap-4` (`--spacing-4`)

### Badge
- Padding: `px-2.5 py-0.5` (`--spacing-2.5` x, `--spacing-0.5` y)

### Sidebar
- Nav item: `px-4` (`--spacing-4`)
- Entre secciones: `space-y-1` (`--spacing-1`)

## Reglas

1. No usar valores fuera de la escala de espaciado
2. Preferir `gap-*` sobre `space-x-*` / `space-y-*` cuando sea flex layout
3. No mezclar `pl-9` y `pl-10` para el mismo patrón (search inputs → usar `pl-10`)
4. Cards siempre con `p-6` interno (no `p-3`, no `p-4`)
5. Empty states centrados con `py-20` / `py-12` para dar sensación de amplitud
