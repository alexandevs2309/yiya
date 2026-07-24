# Elevation — D'Yiya Restaurant's Design System

## Filosofía

La elevación comunica jerarquía visual. A mayor elevación, mayor importancia y cercanía al usuario. Se definen 4 niveles + 1 nivel decorativo.

## Niveles

### Level 0 — Flat `--shadow-none`
Elementos que descansan directamente sobre el fondo.

- Fondos de página
- Sidebar
- Inputs (antes de focus)

### Level 1 — Raised `--shadow-sm`
Elementos que se levantan ligeramente del fondo. Para superficies contenidas.

- Cards
- Botones (estado resting)
- Badges
- Tablas

### Level 2 — Elevated `--shadow-lg`
Elementos que flotan sobre la superficie. Para contenido contextual.

- Dropdowns
- Select options
- Tooltips
- Popovers
- Search results overlay

### Level 3 — Floating `--shadow-xl`
Elementos modales que requieren atención focalizada.

- Modales
- Dialogs de confirmación
- Drawers
- Bottom sheets (cashier)

### Level 4 — Modal `--shadow-2xl`
Elementos que bloquean completamente la interacción con el fondo. Máxima jerarquía.

- Full-screen modals
- Loading overlays
- Error boundaries

### Decorativo — Glow `--shadow-glow`
Para elementos que necesitan destacar visualmente sin aumentar elevación.

- Primary buttons en hover
- Elementos seleccionados activos
- Indicadores de focus

## Asignación por Componente

| Componente | Default | Hover | Active/Focus |
|------------|---------|-------|--------------|
| Card | `shadow-sm` | — | — |
| Button (default) | `shadow-sm` | `shadow-md` | `shadow-sm + active:scale-[0.97]` |
| Button (ghost) | `shadow-none` | `shadow-none` | `shadow-none` |
| Dropdown menu | `shadow-lg` | — | — |
| Modal backdrop | `bg-black/40` | — | — |
| Modal content | `shadow-xl` | — | — |
| Input | `shadow-none` | — | `ring-2 ring-ring` |
| Login card | `shadow-xl` | — | — |
| Table row hover | — | `shadow-none` (bg change) | — |
| Sidebar nav | `shadow-none` | `shadow-none` | `shadow-none` |
| Avatar | `shadow-none` | `shadow-sm` | — |
| Badge | `shadow-sm` | — | — |

## Sombras para Dark Mode

En dark mode, las sombras deben ser más sutiles (menos opacidad) porque el fondo ya es oscuro. Usar:

```css
--shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.15);
--shadow-md: 0 4px 6px -1px oklch(0 0 0 / 0.2), 0 2px 4px -2px oklch(0 0 0 / 0.1);
/* etc — usar el mismo shadow token pero con mayor opacidad en dark */
```

Esto se logra con variables CSS que cambian según la clase `.dark`:

```css
:root, :root.dark {
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.15);
}
:root.light {
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.05);
}
```

## Reglas

1. No crear sombras custom ni usar `shadow-[...]` — usar siempre los tokens definidos
2. Los modales siempre llevan `shadow-xl` + backdrop `bg-black/40`
3. Los botones primarios pueden tener `shadow-glow` en hover como mejora visual
4. No sombrear elementos que ya tienen fondo contrastante (cards sobre bg ya tienen contraste suficiente)
