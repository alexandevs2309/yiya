# Colors — D'Yiya Restaurant's Design System

## Filosofía

La paleta de D'Yiya Restaurant's está inspirada en los elementos naturales de Samaná. Cada color tiene una razón de ser y un propósito específico dentro del sistema. No hay colores aleatorios.

## Paleta de Marca

### Azul Petróleo `--color-azul-petroleo-*`

El color principal. Representa el océano profundo, la elegancia y la confianza. Usado como primary en todo el sistema.

| Nivel | Valor oklch | Uso |
|-------|-------------|-----|
| 50 | `oklch(0.97 0.01 235)` | Fondos muy claros (solo light) |
| 100 | `oklch(0.92 0.03 235)` | Fondos sutiles |
| 200 | `oklch(0.85 0.05 235)` | Bordes suaves |
| 300 | `oklch(0.75 0.08 235)` | Hover states |
| 400 | `oklch(0.65 0.12 235)` | Primary en dark mode |
| 500 | `oklch(0.55 0.16 235)` | Primary brand color |
| 600 | `oklch(0.45 0.16 235)` | Primary en light mode |
| 700 | `oklch(0.35 0.14 235)` | Secondary/muted backgrounds |
| 800 | `oklch(0.25 0.10 235)` | Card backgrounds (dark) |
| 900 | `oklch(0.17 0.06 235)` | Background principal (dark) |

### Arena `--color-arena-*`

Neutral cálido. Evoca la arena de las playas de Samaná. Usado como sustituto del grío neutro.

| Nivel | Valor oklch | Uso |
|-------|-------------|-----|
| 50 | `oklch(0.98 0.01 80)` | Sidebar fondo (light) |
| 100 | `oklch(0.95 0.02 80)` | Secondary backgrounds |
| 200 | `oklch(0.90 0.03 80)` | Bordes |
| 300 | `oklch(0.85 0.04 80)` | Hover |
| 400 | `oklch(0.78 0.05 80)` | Muted foreground |
| 500 | `oklch(0.72 0.06 80)` | Base neutral |
| 600 | `oklch(0.65 0.06 80)` | Muted foreground (dark) |
| 700 | `oklch(0.55 0.05 80)` | Texto secundario |
| 800 | `oklch(0.45 0.04 80)` | Texto terciario |
| 900 | `oklch(0.35 0.03 80)` | Texto oscuro sobre claro |

### Dorado Champán `--color-dorado-champan-*`

El acento de lujo. Representa el sol del atardecer samaniego, la celebración y la calidad. Usado con moderación.

| Nivel | Valor oklch | Uso |
|-------|-------------|-----|
| 50 | `oklch(0.97 0.02 65)` | Fondos muy sutiles |
| 100 | `oklch(0.93 0.04 65)` | Backgrounds claros |
| 200 | `oklch(0.88 0.06 65)` | Acento suave (light) |
| 300 | `oklch(0.80 0.09 65)` | Hover accent |
| 400 | `oklch(0.72 0.12 65)` | Acento (dark) / warning |
| 500 | `oklch(0.65 0.15 65)` | Dorado base |
| 600 | `oklch(0.58 0.15 65)` | Hover dorado |
| 700 | `oklch(0.50 0.13 65)` | Texto dorado |
| 800 | `oklch(0.42 0.10 65)` | Fondo dorado oscuro |
| 900 | `oklch(0.32 0.07 65)` | Máxima saturación oscura |

### Coral `--color-coral-*`

Energía controlada. Representa los arrecifes coralinos. Usado exclusivamente para estados destructivos o de alerta.

| Nivel | Valor oklch | Uso |
|-------|-------------|-----|
| 50 | `oklch(0.97 0.02 25)` | Fondo error suave |
| 100 | `oklch(0.93 0.05 25)` | Background error |
| 200 | `oklch(0.87 0.08 25)` | Borde error |
| 300 | `oklch(0.78 0.12 25)` | Hover destructive |
| 400 | `oklch(0.70 0.16 25)` | Destructive hover |
| 500 | `oklch(0.62 0.19 25)` | Destructive / error |
| 600 | `oklch(0.55 0.19 25)` | Destructive active |
| 700 | `oklch(0.47 0.17 25)` | Texto destructivo |
| 800 | `oklch(0.38 0.13 25)` | Fondo oscuro error |
| 900 | `oklch(0.28 0.08 25)` | Máximo contraste error |

### Verde Salvia `--color-verde-salvia-*`

Naturaleza y frescura. Representa los ingredientes frescos y la vegetación costera. Usado para estados de éxito.

| Nivel | Valor oklch | Uso |
|-------|-------------|-----|
| 50 | `oklch(0.97 0.01 140)` | Fondo éxito suave |
| 100 | `oklch(0.93 0.03 140)` | Background éxito |
| 200 | `oklch(0.88 0.05 140)` | Borde éxito |
| 300 | `oklch(0.80 0.07 140)` | Hover success |
| 400 | `oklch(0.72 0.09 140)` | Success (dark) |
| 500 | `oklch(0.64 0.11 140)` | Success (light) |
| 600 | `oklch(0.56 0.11 140)` | Hover success |
| 700 | `oklch(0.48 0.09 140)` | Texto success |
| 800 | `oklch(0.38 0.07 140)` | Fondo oscuro success |
| 900 | `oklch(0.28 0.04 140)` | Máximo contraste |

### Marfil `--color-marfil-*`

Blanco cálido. Representa textiles limpios, mantelería y hospitalidad. Usado como fondo claro y texto sobre oscuro.

| Nivel | Valor oklch | Uso |
|-------|-------------|-----|
| 50 | `oklch(0.99 0.005 90)` | Fondo principal (light) |
| 100 | `oklch(0.97 0.01 90)` | Fondo input (dark) |
| 200 | `oklch(0.94 0.015 90)` | Bordes suaves |
| 300 | `oklch(0.90 0.02 90)` | Hover claro |
| 400 | `oklch(0.85 0.025 90)` | Fondo secundario |
| 500 | `oklch(0.80 0.03 90)` | Base marfil |
| 600 | `oklch(0.73 0.03 90)` | Texto atenuado |
| 700 | `oklch(0.65 0.025 90)` | Texto secundario |
| 800 | `oklch(0.55 0.02 90)` | Texto terciario |
| 900 | `oklch(0.45 0.015 90)` | Máximo oscuro |

## Asignación Temática

### Dark Mode (`:root.dark`)

| Rol | Token | Valor |
|-----|-------|-------|
| Background | `--color-background` | Azul Petróleo 900 |
| Surface | `--color-card` | Azul Petróleo 800 |
| Primary | `--color-primary` | Azul Petróleo 400 |
| Accent | `--color-accent` | Dorado Champán 400 |
| Success | `--color-success` | Verde Salvia 400 |
| Warning | `--color-warning` | Dorado Champán 400 |
| Error | `--color-destructive` | Coral 500 |
| Text | `--color-foreground` | Marfil 100 |
| Muted text | `--color-muted-foreground` | Azul Petróleo 400 |
| Border | `--color-border` | Azul Petróleo 600 |

### Light Mode (`:root.light`)

| Rol | Token | Valor |
|-----|-------|-------|
| Background | `--color-background` | Marfil 50 |
| Surface | `--color-card` | Marfil 50 |
| Primary | `--color-primary` | Azul Petróleo 600 |
| Accent | `--color-accent` | Dorado Champán 500 |
| Success | `--color-success` | Verde Salvia 500 |
| Warning | `--color-warning` | Dorado Champán 500 |
| Error | `--color-destructive` | Coral 500 |
| Text | `--color-foreground` | Azul Petróleo 900 |
| Muted text | `--color-muted-foreground` | Arena 600 |
| Border | `--color-border` | Arena 200 |

## Reglas de Uso

1. **Primary** para acciones principales, links, botones primarios, indicadores activos
2. **Secondary** para fondos de elementos secundarios, tabs inactivos
3. **Accent (Dorado Champán)** para highlights importantes, badges premium, detalles decorativos — nunca para fondos grandes
4. **Success** solo para estados de completado, confirmación, ítems listos
5. **Warning** para estados pendientes, advertencias, tiempo límite próximo
6. **Destructive (Coral)** para errores, eliminar, cancelar, alertas críticas
7. **Muted foreground** para metadatos, etiquetas, texto secundario
8. **Marfil 100** como color de texto sobre fondos oscuros (foreground)
9. **Azul Petróleo 900** como color de texto sobre fondos claros (foreground)

## Contraste WCAG

| Combinación | Ratio | Nivel |
|-------------|-------|-------|
| `--color-primary` sobre `--color-background` (dark) | ≥ 4.5:1 | AA |
| `--color-primary` sobre `--color-background` (light) | ≥ 4.5:1 | AA |
| `--color-foreground` sobre `--color-background` | ≥ 7:1 | AAA |
| `--color-muted-foreground` sobre `--color-background` | ≥ 4.5:1 | AA |
| `--color-destructive` sobre `--color-background` | ≥ 4.5:1 | AA |
