# Typography — D'Yiya Restaurant's Design System

## Font Families

| Token | Font Stack | Uso |
|-------|-----------|-----|
| `--font-heading` | `"Cormorant Garamond", "Georgia", serif` | Títulos principales, logo, página de login |
| `--font-body` | `"Inter", system-ui, -apple-system, sans-serif` | UI general, labels, párrafos |
| `--font-mono` | `"JetBrains Mono", "Fira Code", monospace` | Código, depuración, NCF |
| `--font-kds` | `"Inter", system-ui, sans-serif` | Kitchen Display (optimizado para legibilidad distante) |
| `--font-number` | `"Inter", system-ui, sans-serif` | Montos, cantidades, precios (tabular-nums) |
| `--font-receipt` | `"Courier New", monospace` | Impresión de tickets térmicos |

## Carga de Fuentes

Se debe cargar **Inter** (400, 500, 600, 700) y **Cormorant Garamond** (500, 600, 700) vía Google Fonts en el `<head>` de `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet" />
```

## Escala Tipográfica

| Token | Size | Line Height | Uso |
|-------|------|-------------|-----|
| `--text-xs` | 0.75rem (12px) | 1.5 | Metadatos, badges, timestamps |
| `--text-sm` | 0.875rem (14px) | 1.5 | Body, labels, contenido de cards |
| `--text-base` | 1rem (16px) | 1.5 | Párrafos, contenido general |
| `--text-lg` | 1.125rem (18px) | 1.4 | Subtítulos, totales |
| `--text-xl` | 1.25rem (20px) | 1.4 | Secciones, pantallas de éxito |
| `--text-2xl` | 1.5rem (24px) | 1.3 | Page titles, headers de página |
| `--text-3xl` | 1.875rem (30px) | 1.2 | Títulos de sección grandes |
| `--text-4xl` | 2.25rem (36px) | 1.1 | KDS display, montos grandes |
| `--text-5xl` | 3rem (48px) | 1.1 | Hero, login branding |

## Pesos

| Peso | Variable | Token CSS | Uso |
|------|----------|-----------|-----|
| 400 | Normal | `--font-weight-normal` | Body text, párrafos |
| 500 | Medium | `--font-weight-medium` | Labels, headers de tabla |
| 600 | Semibold | `--font-weight-semibold` | Títulos de card, botones |
| 700 | Bold | `--font-weight-bold` | Page titles, montos, énfasis fuerte |

## Aplicación por Componente

| Componente | Font Family | Size | Weight |
|------------|-------------|------|--------|
| Page title | Heading | 2xl | Bold |
| Card title | Body | base | Semibold |
| Card description | Body | sm | Normal |
| Button label | Body | sm | Medium |
| Input label | Body | xs | Medium |
| Table header | Body | xs | Medium |
| Table cell | Body | sm | Normal |
| Badge | Body | xs | Medium |
| KDS order item | KDS | 2xl | Bold |
| KDS time | KDS | sm | Normal |
| POS total | Number | xl | Bold |
| POS item name | Body | sm | Medium |
| POS item price | Number | xs | Semibold |
| Modal title | Body | lg | Semibold |
| Sidebar nav | Body | sm | Medium |
| Ticket body | Receipt | 10px (0.625rem) | Normal |
| Login title | Heading | 4xl | Bold |
| Empty state | Body | lg | Medium |

## Números Tabulares

Para montos, precios, cantidades y cualquier display numérico en POS/cashier/reports:

```css
font-variant-numeric: tabular-nums;
```

Esto asegura que todos los dígitos tengan el mismo ancho y los números no se "muevan" al cambiar.

## Kitchen Display (KDS)

La tipografía del KDS prioriza legibilidad a distancia:

- `font-family: var(--font-kds)` (Inter, sin serif para máxima claridad)
- Order item names: `text-2xl` (24px) con `font-bold`
- Table numbers: `text-4xl` (36px) con `font-bold`
- Tiempo transcurrido: `text-sm` con `font-normal` y `--color-muted-foreground`
- Badges de estado: `text-xs` con `font-medium`
