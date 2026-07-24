# Plan de Migración — Design System D'Yiya

**Estado actual**: Auditoría completada. 10 categorías de hallazgos.

**Objetivo**: Migrar el frontend completo al nuevo sistema de identidad visual en 7 fases, sin romper funcionalidad existente.

---

## Fase 0 — Limpieza Preparatoria (1 hora)

### 0.1 Eliminar código muerto

| Archivo | Acción |
|---------|--------|
| `frontend/src/App.css` | **Eliminar archivo completo** (+180 líneas de boilerplate Vite no utilizado). El contenido relevante ya está en index.css. |

**Riesgo**: Ninguno. El archivo no es importado por ningún componente activo. Verificar que ningún archivo haga `import './App.css'`.

### 0.2 Cargar fuentes correctamente

| Archivo | Acción |
|---------|--------|
| `frontend/index.html` | Agregar `<link>` a Google Fonts para **Inter** (400,500,600,700) + **Cormorant Garamond** (500,600,700) |

**Riesgo**: Bajo. Sin la carga, las fuentes caen en system-ui (comportamiento actual).

---

## Fase 1 — Implementar Paleta de Marca en CSS (2 horas)

### 1.1 Reemplazar index.css

Sustituir la paleta actual (oklch con hue ~250 genérico) por la nueva paleta de marca con todos los colores y escalas:

| Nuevo | Reemplaza |
|-------|-----------|
| `--color-azul-petroleo-{50..900}` | — (nuevo) |
| `--color-arena-{50..900}` | — (nuevo) |
| `--color-dorado-champan-{50..900}` | — (nuevo) |
| `--color-coral-{50..900}` | — (nuevo) |
| `--color-verde-salvia-{50..900}` | — (nuevo) |
| `--color-marfil-{50..900}` | — (nuevo) |
| `--color-accent` | — (nuevo, antes no existía) |
| `--shadow-*` con opacidad dark/light | Sombras genéricas actuales |
| `--radius-2xl` | — (agregar al theme) |

### 1.2 Reasignar tokens semánticos

Actualizar `:root.dark` y `:root.light` blocks con los nuevos valores de la paleta (según `colors.md` → Asignación Temática).

### 1.3 Agregar tokens faltantes

- `--font-heading`, `--font-body`, `--font-kds`, `--font-number`, `--font-mono`
- `--color-accent` y `--color-accent-foreground`
- `--duration-*` tokens en CSS
- `--ease-*` tokens en CSS

---

## Fase 2 — Refactorizar Componentes Base (3 horas)

### 2.1 Button
- [ ] Eliminar `text-white` de variantes (debe heredar de `--color-*-foreground`)
- [ ] Verificar que todas las instancias usen el componente `<Button>` (no raw `<button>`)
- [ ] Reemplazar raw buttons en: header.tsx, pos.tsx (qty +/-), settings.tsx, login.tsx
- [ ] Agregar variante `xl` si se necesita para cashier

### 2.2 Card
- [ ] Unificar padding: `CardContent` siempre `p-6 pt-0`
- [ ] Reemplazar `p-3`, `p-4` en POS, kiosk, reports por `p-6 pt-0`
- [ ] Verificar que tablas usen `p-0`

### 2.3 Input
- [ ] Unificar fondo: usar siempre `--color-input` (eliminar `bg-secondary/50`)
- [ ] Reemplazar `pl-9` por `pl-10` en inventory.tsx, customers.tsx
- [ ] Agregar estilo `disabled:`
- [ ] Verificar que todos los inputs usen el mismo foco

### 2.4 Badge
- [ ] Ya migrado a tokens semánticos ✅

### 2.5 Modal
- [ ] Verificar que todos los modales usen el componente `<Modal>`
- [ ] Reemplazar modales inline en: pos.tsx, floor-plan.tsx

---

## Fase 3 — Reemplazar Colores Hardcodeados (2 horas)

### 3.1 Gradientes con Tailwind default
| Archivo | Cambio |
|---------|--------|
| `header.tsx:117` | `to-blue-400` → `to-[var(--color-dorado-champan-400)]` o token acento |
| `login.tsx:107` | `to-blue-500` → `to-[var(--color-dorado-champan-500)]` |

### 3.2 Backdrops
| Archivo | Cambio |
|---------|--------|
| `modal.tsx:10` | `bg-black/40` → mantener (estándar) |
| `pos.tsx:306` | `bg-black/40` → mantener |
| `floor-plan.tsx:105` | `bg-black/40` → mantener |

(Backdrop negro es universal y funciona en ambos temas.)

### 3.3 Chart colors (reports.tsx)
| Línea | Cambio |
|-------|--------|
| `#ef4444` | `var(--color-destructive)` |
| `#f59e0b` | `var(--color-warning)` |
| `#3b82f6` | `var(--color-primary)` |
| `#8b5cf6` | `var(--color-accent)` |

### 3.4 Receipt styles
| Archivo | Cambio |
|---------|--------|
| `receipt.tsx` | Usar variables CSS en lugar de hex (#000, #fff, #555, #666) |

---

## Fase 4 — Unificar Espaciado y Radios (2 horas)

### 4.1 Search inputs
- `pl-9` → `pl-10` en `inventory.tsx:91`, `customers.tsx:74`

### 4.2 Card content padding
- Reemplazar `p-3` y `p-4` en CardContent de pages por `p-6`

### 4.3 rounded-2xl
- Definir `--radius-2xl` en theme tokens (1.5rem)
- O reemplazar por `rounded-xl` en pos.tsx:140 y login.tsx:107

### 4.4 Grid gaps
- Estandarizar grids:
  - POS menu: `gap-3`
  - Dashboard stats: `gap-4`
  - KDS orders: `gap-4`
  - Forms: `gap-4`

### 4.5 Label spacing
- Unificar labels de formulario: `mb-1`

### 4.6 Button gaps
- Eliminar `gap-1` overrides en settings.tsx → usar `gap-2` del componente

---

## Fase 5 — Refactorizar Kitchen Display (1 hora)

### 5.1 KDS
- [ ] Aplicar tipografía KDS (`font-kds` con weights bold en items, 4xl en mesa)
- [ ] Mantener colores semánticos (ya migrados)
- [ ] Agregar warning border cuando tiempo excede límite
- [ ] Asegurar que las columnas usen `gap-4` consistente

---

## Fase 6 — Verificación y QA (2 horas)

### 6.1 Build check
- `npx tsc --noEmit` ✅
- `npx vite build` ✅

### 6.2 Visual regression
- Recorrer cada página en dark mode
- Recorrer cada página en light mode
- Verificar contraste WCAG AA

### 6.3 Responsive check
- Verificar layout en 1920×1080
- Verificar layout en 1366×768
- Verificar sidebar colapsado
- Verificar KDS en pantalla completa

---

## Resumen de Archivos a Modificar

| Archivo | Fase | Cambio |
|---------|------|--------|
| `frontend/index.html` | 0, 1 | Agregar Google Fonts, limpiar |
| `frontend/src/index.css` | 1 | Paleta completa + tokens nuevos |
| `frontend/src/App.css` | 0 | ELIMINAR |
| `frontend/src/components/ui/button.tsx` | 2 | Verificar variantes |
| `frontend/src/components/ui/card.tsx` | 2 | Verificar padding |
| `frontend/src/components/ui/input-field.tsx` | 2 | Unificar bg |
| `frontend/src/components/ui/modal.tsx` | 2 | Verificar |
| `frontend/src/components/ui/avatar.tsx` | 2 | Verificar |
| `frontend/src/components/receipt.tsx` | 3 | Usar variables CSS |
| `frontend/src/components/layout/header.tsx` | 3 | Gradiente avatar |
| `frontend/src/components/layout/sidebar.tsx` | 2 | Verificar |
| `frontend/src/pages/login.tsx` | 1, 3 | Logo gradiente, heading font |
| `frontend/src/pages/dashboard.tsx` | 2 | Card padding |
| `frontend/src/pages/pos.tsx` | 2, 4 | Card padding, search pl, raw buttons |
| `frontend/src/pages/kds.tsx` | 5 | Tipografía KDS |
| `frontend/src/pages/cashier.tsx` | 2, 4 | Card padding, search pl |
| `frontend/src/pages/floor-plan.tsx` | 2, 4 | Modal raw |
| `frontend/src/pages/invoicing.tsx` | 2 | Card padding |
| `frontend/src/pages/inventory.tsx` | 2, 4 | Card padding, search pl |
| `frontend/src/pages/customers.tsx` | 2, 4 | Card padding, search pl |
| `frontend/src/pages/reports.tsx` | 3, 4 | Chart colors, card padding |
| `frontend/src/pages/settings.tsx` | 2, 4 | Card padding, button gaps |

---

## Orden de Ejecución Recomendado

1. **Fase 0** — Limpieza (bajo riesgo, prepara el terreno)
2. **Fase 1** — Paleta CSS (cambia variables, pero componentes siguen funcionando)
3. **Fase 2** — Componentes base (cambios controlados en el design system)
4. **Fase 3** — Colores hardcodeados (reemplazos directos)
5. **Fase 4** — Espaciado (unificación visual)
6. **Fase 5** — KDS (toque final)
7. **Fase 6** — QA (verificación)

Cada fase debe ir seguida de `npx tsc --noEmit && npx vite build` para verificar que no hay errores.
