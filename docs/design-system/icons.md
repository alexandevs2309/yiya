# Icons — D'Yiya Restaurant's Design System

## Librería Oficial

**Lucide React** es la única librería de iconos del proyecto.

No se permite:
- Font Awesome
- Heroicons
- Phosphor
- SVG inline (excepto el logo)
- Emoji como icono

## Tamaños

| Contexto | Tamaño | Clase |
|----------|--------|-------|
| Sidebar nav | 20px | `w-5 h-5` |
| Button icon | 16px | `w-4 h-4` |
| Table actions | 14px | `w-3.5 h-3.5` |
| Alert/status | 20px | `w-5 h-5` |
| Empty state | 48px | `w-12 h-12` |
| Page icon | 24px | `w-6 h-6` |
| Avatar | 24px | `w-6 h-6` |
| KDS status | 16px | `w-4 h-4` |

## Colores

Los iconos heredan `currentColor` por defecto. Para colores específicos:

- `text-muted-foreground` — iconos decorativos, acompañando texto
- `text-primary` — iconos de acción primaria
- `text-success` — estados de completado
- `text-warning` — alertas y pendientes
- `text-destructive` — errores y eliminación

**Prohibido**: colores directos como `text-blue-500`, `text-emerald-600`, etc.

## Stroke Width

Lucide usa `strokeWidth` por defecto. Usar:

| Contexto | strokeWidth |
|----------|-------------|
| General UI | 2 (default) |
| KDS displays | 2.5 |
| Sidebar | 2 |
| Avatar/logo | 1.5 |

## Iconos por Módulo

| Módulo | Icono Principal | Acción Primaria |
|--------|----------------|-----------------|
| Dashboard | `LayoutDashboard` | — |
| POS | `ShoppingCart` | `Send` (pagar) |
| KDS | `ChefHat` | — |
| Cashier | `DollarSign` | `Printer` (ticket) |
| Invoicing | `FileText` | `Send` (reenviar) |
| Inventory | `Package` | `Plus` (agregar) |
| Customers | `Users` | `Plus` (agregar) |
| Reports | `BarChart3` | `Download` (exportar) |
| Settings | `Settings` | — |
| Floor Plan | `Grid3X3` | — |
| Login | `Shell` | — |
| Kiosk | `Shell` | `Send` (ordenar) |

## Logo

El logo de D'Yiya Restaurant's usa el icono `Shell` de lucide-react como símbolo temporal. En el futuro, se reemplazará por un SVG personalizado del logotipo oficial.
