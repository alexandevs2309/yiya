# Components — D'Yiya Restaurant's Design System

## Principios

1. **Consistencia ante todo** — mismo componente = mismo estilo en toda la app
2. **Composición sobre configuración** — prefiera componer componentes existentes antes de agregar props
3. **Estados visibles** — todo elemento interactivo tiene estados resting, hover, active, focus, disabled
4. **Una fuente de verdad** — los estilos viven en los componentes, no en las páginas

## Button

| Prop | Valores | Default |
|------|---------|---------|
| `variant` | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link` | `default` |
| `size` | `sm`, `default`, `lg`, `xl`, `icon`, `icon-sm` | `default` |

Height: `h-8` (sm), `h-9` (default), `h-10` (lg), `h-12` (xl), `w-9 h-9` (icon)

- **No** usar `<button>` raw — siempre usar el componente `<Button>`
- Icon + text: siempre con `gap-2`

**Prohibido**: variantes inline con bg-*, text-*, border-* custom. Usar variantes del componente.

## Card

Único componente Card para todo el sistema.

| Subcomponente | Padding |
|---------------|---------|
| `<Card>` | — (solo container) |
| `<CardHeader>` | `p-6` |
| `<CardTitle>` | `text-base font-semibold` |
| `<CardDescription>` | `text-sm text-muted-foreground` |
| `<CardContent>` | `p-6 pt-0` |
| `<CardFooter>` | `p-6 pt-0` |

**Cards sin padding**: cuando el contenido es una tabla, `<CardContent className="p-0">`.

**Cards clickeables**: agregar `cursor-pointer hover:border-primary/30 transition-colors`.

**Prohibido**: `p-3`, `p-4` en CardContent. Usar siempre `p-6 pt-0`.

## Input

| Elemento | Background | Border | Focus |
|----------|------------|--------|-------|
| `<input>` | `--color-input` | `--color-border` | `ring-2 ring-ring` |
| `<select>` | `--color-input` | `--color-border` | `ring-2 ring-ring` |
| `<textarea>` | `--color-input` | `--color-border` | `ring-2 ring-ring` |

- Altura: `h-10` (40px) para inputs estándar
- Border radius: `--radius-lg`
- Padding: `px-3 py-2`
- Label: `text-xs text-muted-foreground mb-1 block`
- Search input con icono: `pl-10` (icono posicionado absoluto a `left-3`)
- Disabled: `opacity-50 cursor-not-allowed`

**Prohibido**: mezclar `bg-input` con `bg-secondary/50`. Usar solo `--color-input`.

## Modal

| Elemento | Estilo |
|----------|--------|
| Backdrop | `bg-black/40` (fijo, en todas las instancias) |
| Content | `bg-card shadow-xl rounded-xl border` |
| Padding | `p-6` |
| Close button | Icono `X` con variante ghost |

- Usar siempre el componente `<Modal>` con framer-motion `AnimatePresence`
- No crear modales inline con posicionamiento manual

## Badge

| Variant | Visual |
|---------|--------|
| `default` | `bg-primary/15 text-primary` |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `success` | `bg-success/15 text-success` |
| `warning` | `bg-warning/15 text-warning` |
| `destructive` | `bg-destructive/15 text-destructive` |
| `outline` | `border text-foreground` |

- Shape: `rounded-full`
- Padding: `px-2.5 py-0.5`

## Table

- Header: `text-xs font-medium text-muted-foreground uppercase tracking-wider`
- Cells: `p-3 text-sm`
- Row hover: `hover:bg-muted/30`
- No border en última fila: `last:border-0`

## Sidebar

- Fondo: `--color-sidebar` (Azul Petróleo 950 dark, Arena 50 light)
- Nav item: `px-4 py-2 rounded-lg text-sm font-medium transition-colors`
- Active: `bg-primary/10 text-primary border-l-[3px] border-primary`
- Collapsed: solo iconos, `w-16`

## Header

- Fijo arriba, `h-14` (56px)
- Fondo: `--color-background`
- Avatar: gradiente `from-primary to-dorado-champan-400`
- Dropdown: `rounded-xl shadow-lg p-1.5`

## Kitchen Display (KDS)

El KDS comparte el mismo sistema visual pero optimizado para lectura a distancia:

- Fondo: `bg-background` (oscuro por defecto)
- Order cards: `bg-card rounded-xl border shadow-sm p-6`
- Item name: `font-bold text-2xl`
- Table number: `font-bold text-4xl`
- Timer: `text-sm text-muted-foreground`
- Status badges: variantes success/warning/destructive
- Warning (tiempo excedido): borde con `border-warning/50`

## POS

El POS comparte exactamente el mismo lenguaje visual:

- Category pills: `rounded-full px-4 py-1.5 text-sm`
- Menu item cards: mismas especificaciones que Card
- Cart: `space-y-1` entre items, cada item `p-3 rounded-lg`
- Total display: `text-xl font-bold`

## Tablas de Datos (Inventory, Customers, Invoicing)

Todas siguen el mismo patrón:
- Card sin padding que contiene la tabla
- Header con título + botón de acción + search input
- Tabla con header estilizado y hover en filas
- Empty state con icono + texto + acción

## Estados Vacíos

```
Icon (48x48, text-muted-foreground)
Title (text-lg font-medium)
Description (text-sm text-muted-foreground)
Action button (opcional)
```

## Disabled States

Todos los elementos interactivos deben tener estado disabled visual:
- Button: `opacity-50 cursor-not-allowed`
- Input: `opacity-50 cursor-not-allowed`
- Select: `opacity-50 cursor-not-allowed`
- Checkbox: `opacity-50 cursor-not-allowed`

Sin hover effects cuando está disabled.
