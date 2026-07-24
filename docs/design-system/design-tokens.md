# Design Tokens — D'Yiya Restaurant's

## Convención de Nombres

```
--{categoría}-{propiedad}-{variante}
```

- `--color-primary` → color semántico
- `--color-azul-petroleo-500` → color de paleta
- `--spacing-4` → spacing
- `--radius-md` → border radius
- `--shadow-lg` → elevación
- `--font-heading` → tipografía
- `--duration-normal` → animación

## Tokens de Color

### Paleta Completa

Cada color de marca tiene una escala de 10 niveles (50–900).

```
--color-azul-petroleo-{50..900}
--color-arena-{50..900}
--color-dorado-champan-{50..900}
--color-coral-{50..900}
--color-verde-salvia-{50..900}
--color-marfil-{50..900}
```

### Tokens Semánticos

Definidos en `:root` y `:root.dark` / `:root.light`.

| Token | Dark | Light | Propósito |
|-------|------|-------|-----------|
| `--color-background` | Azul Petróleo 900 | Marfil 50 | Fondo principal de pantalla |
| `--color-foreground` | Marfil 100 | Azul Petróleo 900 | Texto principal |
| `--color-card` | Azul Petróleo 800 | Marfil 50 | Fondo de tarjetas |
| `--color-card-foreground` | Marfil 100 | Azul Petróleo 900 | Texto en tarjetas |
| `--color-popover` | Azul Petróleo 800 | Blanco | Fondo de popovers/dropdowns |
| `--color-popover-foreground` | Marfil 100 | Azul Petróleo 900 | Texto en popovers |
| `--color-primary` | Azul Petróleo 400 | Azul Petróleo 600 | Acción principal, acento |
| `--color-primary-foreground` | Marfil 50 | Marfil 50 | Texto sobre primary |
| `--color-secondary` | Azul Petróleo 700 | Arena 100 | Fondo secundario |
| `--color-secondary-foreground` | Marfil 100 | Azul Petróleo 900 | Texto sobre secondary |
| `--color-muted` | Azul Petróleo 700 | Arena 100 | Fondo atenuado |
| `--color-muted-foreground` | Azul Petróleo 400 | Arena 600 | Texto atenuado |
| `--color-accent` | Dorado Champán 400 | Dorado Champán 500 | Acento, highlight |
| `--color-accent-foreground` | Azul Petróleo 900 | Azul Petróleo 900 | Texto sobre accent |
| `--color-destructive` | Coral 500 | Coral 500 | Error, peligro, eliminar |
| `--color-destructive-foreground` | Marfil 50 | Marfil 50 | Texto sobre destructive |
| `--color-success` | Verde Salvia 400 | Verde Salvia 500 | Éxito, completado |
| `--color-warning` | Dorado Champán 400 | Dorado Champán 500 | Advertencia, pendiente |
| `--color-border` | Azul Petróleo 600 | Arena 200 | Bordes de elementos |
| `--color-input` | Azul Petróleo 700 | Marfil 100 | Fondo de inputs |
| `--color-ring` | Dorado Champán 400 | Azul Petróleo 400 | Focus ring |
| `--color-sidebar` | Azul Petróleo 950 | Arena 50 | Fondo sidebar |
| `--color-sidebar-foreground` | Marfil 200 | Azul Petróleo 700 | Texto en sidebar |

## Tokens de Tipografía

```
--font-heading: "Cormorant Garamond", serif
--font-body: "Inter", system-ui, -apple-system, sans-serif
--font-mono: "JetBrains Mono", "Fira Code", monospace
--font-kds: "Inter", system-ui, sans-serif
--font-number: "Inter", system-ui, sans-serif [tabular-nums]
--font-receipt: "Courier New", monospace
```

## Tokens de Espaciado

```
--spacing-0:   0px
--spacing-0.5: 0.125rem  (2px)
--spacing-1:   0.25rem   (4px)
--spacing-1.5: 0.375rem  (6px)
--spacing-2:   0.5rem    (8px)
--spacing-2.5: 0.625rem  (10px)
--spacing-3:   0.75rem   (12px)
--spacing-3.5: 0.875rem  (14px)
--spacing-4:   1rem      (16px)
--spacing-5:   1.25rem   (20px)
--spacing-6:   1.5rem    (24px)
--spacing-7:   1.75rem   (28px)
--spacing-8:   2rem      (32px)
--spacing-9:   2.25rem   (36px)
--spacing-10:  2.5rem    (40px)
--spacing-12:  3rem      (48px)
--spacing-14:  3.5rem    (56px)
--spacing-16:  4rem      (64px)
--spacing-20:  5rem      (80px)
--spacing-24:  6rem      (96px)
```

## Tokens de Radio

```
--radius-none: 0
--radius-sm:   0.375rem  (6px)
--radius-md:   0.5rem    (8px)
--radius-lg:   0.75rem   (12px)
--radius-xl:   1rem      (16px)
--radius-2xl:  1.5rem    (24px)
--radius-full: 9999px
```

## Tokens de Elevación

```
--shadow-sm:    0 1px 2px 0 oklch(0 0 0 / 0.05)
--shadow-md:    0 4px 6px -1px oklch(0 0 0 / 0.08), 0 2px 4px -2px oklch(0 0 0 / 0.05)
--shadow-lg:    0 10px 15px -3px oklch(0 0 0 / 0.10), 0 4px 6px -4px oklch(0 0 0 / 0.05)
--shadow-xl:    0 20px 25px -5px oklch(0 0 0 / 0.12), 0 8px 10px -6px oklch(0 0 0 / 0.05)
--shadow-2xl:   0 25px 50px -12px oklch(0 0 0 / 0.25)
--shadow-glow:  0 0 20px oklch(var(--color-primary) / 0.15)
```

## Tokens de Animación

```
--duration-instant:   0ms
--duration-fast:      100ms
--duration-normal:    200ms
--duration-slow:      300ms
--duration-slower:    500ms
--ease-default:       cubic-bezier(0.4, 0, 0.2, 1)
--ease-in:            cubic-bezier(0.4, 0, 1, 1)
--ease-out:           cubic-bezier(0, 0, 0.2, 1)
--ease-spring:        cubic-bezier(0.34, 1.56, 0.64, 1)
```
