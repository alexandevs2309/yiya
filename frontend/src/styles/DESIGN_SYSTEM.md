# D'Yiya Design System

Paleta caribeña inspirada en Samaná, República Dominicana.

## Colores

### Palette primaria

| Token | Hex | Uso |
|---|---|---|
| `caribe` | `#0EA5E9` | Acción principal, botones primarios, enlaces, elementos activos |
| `arena` | `#F5E6D3` | Fondos cálidos (light mode), texto sobre fondos oscuros |
| `samana` | `#10B981` | Éxito, confirmaciones, estados activos, verde check |
| `coral` | `#F43F5E` | Destructivo, errores, alertas, cancelar, eliminar |
| `sol` | `#F97316` | Advertencias, modo sol activo, ámbar, atención |
| `noche` | `#0F1117` | Fondo dark principal |
| `superficie` | `#1E2130` | Cards, paneles, inputs en dark mode |
| `borde` | `#2A2D3E` | Bordes y separadores en dark mode |

### Tokens semánticos

| Token | Dark mode | Light mode | Modo Sol |
|---|---|---|---|
| `background` | `noche` | `arena` | `#FFFFFF` |
| `foreground` | `arena` | `noche` | `#0F1117` |
| `primary` | `caribe` | `#0284C7` | `#075985` |
| `success` | `samana` | `samana` | `#047857` |
| `destructive` | `coral` | `coral` | `#BE123C` |
| `warning` | `sol` | `#D97706` | `#92400E` |

## Tipografía

| Uso | Font | Weight |
|---|---|---|
| Títulos pantalla | Inter | 600 / 700 |
| Subtítulos, cards | Inter | 500 / 600 |
| Cuerpo, labels | Inter | 400 / 500 |
| Números (caja, POS) | Inter | 600, `tabular-nums` |
| Código, recibos | JetBrains Mono | 400 |

### Tamaños

- Cuerpo normal: `14px` (`text-sm`)
- Cuerpo grande: `16px` (`text-base`)
- Números caja/POS: `20px+` con `font-variant-numeric: tabular-nums`
- Títulos: `text-lg` / `text-xl` / `text-2xl`
- Modo Sol: `18px` base (body)

## Espaciados

Todos los espaciados usan múltiplos de `4px` (Tailwind spacing scale).

- `gap-1` = 4px
- `gap-2` = 8px
- `gap-3` = 12px
- `gap-4` = 16px
- `p-4` = 16px padding
- `p-6` = 24px padding

## Bordes y esquinas

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | `0.375rem` (6px) | Badges, chips |
| `radius-md` | `0.5rem` (8px) | Inputs, botones chicos |
| `radius-lg` | `0.75rem` (12px) | Cards, botones grandes, modales |
| `radius-xl` | `1rem` (16px) | Paneles principales, sidebar |
| `radius-2xl` | `1.5rem` (24px) | Diálogos, popovers |

## Sombras

- `shadow-sm`: Cards, botones en estado normal
- `shadow-md`: Cards en hover, dropdowns
- `shadow-lg`: Modales, popovers
- `shadow-glow`: Elementos activos, primary glow

## Estados visuales

| Estado | Regla |
|---|---|
| **Normal** | Token base del componente |
| **Hover** | `brightness-110` en botones primarios, `bg-accent/10` en ghost |
| **Active/Click** | `scale-[0.97]` en botones (via `active:` en cva) |
| **Disabled** | `opacity-50`, `pointer-events-none` |
| **Focus visible** | `ring-2 ring-ring ring-offset-2` |
| **Loading** | Spinner animado reemplaza icono/texto + `opacity-70` |

## Modo Sol

Clase `.modo-sol` en `<html>` — activado vía toggle en la topbar (icono Sol).

- Fondo blanco puro, texto negro
- Bordes con alto contraste (`#64748B`)
- Sin sombras (favorece trazos sólidos)
- Font-size base `18px` para legibilidad al sol
- Ideal para terraza / exteriores / playa

## Componentes base

### Button
| Variant | Uso |
|---|---|
| `default` | Acción principal (primary caribe) |
| `destructive` | Eliminar, cancelar, peligro |
| `success` | Confirmar, pagar, completar |
| `outline` | Acción secundaria, bordes visibles |
| `secondary` | Fondo suave, menos énfasis |
| `ghost` | Mínimo impacto, toolbars |
| `link` | Navegación inline |

### Badge
| Variant | Uso |
|---|---|
| `default` | Primary, tags genéricos |
| `secondary` | Información neutral |
| `destructive` | Errores, urgentes |
| `success` | Completado, activo, online |
| `warning` | Pendiente, atención |
| `outline` | Borde sutil, sin fondo |
| `caribe` | Badge informativo con acento azul |

### Card
- Padding estándar: `p-6` con header/content/footer
- Hover: `shadow-md` + transición suave
- Borde: `border-border`

### Sidebar
- Ancho: 240px (collapsed: 68px)
- Active item: borde izquierdo `border-l-[3px] border-primary` + fondo `bg-primary/10`
- Logo: icono Shell en badge primary con glow
- Inactive items: `text-sidebar-foreground/70`

### Header (Topbar)
- Altura: `h-14` (56px)
- Fondo: `bg-background/80 backdrop-blur-md`
- Botón Modo Sol: icono `SunMedium` con indicador naranja cuando activo
- Clock display: hora local con saludo contextual
