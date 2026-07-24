# Animations — D'Yiya Restaurant's Design System

## Filosofía

Las animaciones son funcionales, no decorativas. Deben comunicar jerarquía, dirección y estado sin distraer. El movimiento es sutil y elegante, acorde con la identidad Luxury Coastal Caribbean.

## Duraciones

| Token | Milisegundos | Uso |
|-------|-------------|-----|
| `instant` | 0ms | Cambios de estado sin transición visual |
| `fast` | 100ms | Hover effects, micro-interacciones |
| `normal` | 200ms | Transiciones de estado, focus, active |
| `slow` | 300ms | Entrada/salida de elementos |
| `slower` | 500ms | Page transitions, modales |

## Curvas

| Token | Curva | Uso |
|-------|-------|-----|
| `ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Transiciones estándar |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elementos que salen |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elementos que entran |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Botones, micro-interacciones alegres |

## Patrones de Movimiento

### Page Transitions
```
Initial:    opacity: 0, y: -10
Enter:      opacity: 1, y: 0
Duration:   300ms
Ease:       ease-out
```

Aplicado a todas las páginas via `motion.div` wrapper.

### Modales (AnimatePresence)
```
Backdrop:   opacity: 0 → 1 (200ms, ease-out)
Content:    scale: 0.95 → 1 + opacity: 0 → 1 (250ms, ease-spring)
Exit:       opacity: 1 → 0 (150ms, ease-in)
```

### Botones
```
Hover:      brightness: 1 → 1.1 (100ms, ease-default)
Active:     scale: 1 → 0.97 (50ms, ease-in)
           scale: 0.97 → 1 (150ms, ease-spring)
```

### Dropdowns / Popovers
```
Enter:      opacity: 0 → 1, y: -4 → 0 (200ms, ease-out)
Exit:       opacity: 1 → 0 (150ms, ease-in)
```

### Sidebar Collapse
```
Width:      spring (stiffness: 300, damping: 30)
Labels:     opacity fade (150ms)
```

### KDS Order Cards
```
Enter:      opacity: 0, scale: 0.95 → 1 (300ms, ease-out)
Layout:     layout animation (spring)
Exit:       opacity: 0, scale: 0.95 (200ms, ease-in)
```

### List Items (Cart, Order Items)
```
Enter:      opacity: 0, x: 20 → 0 (200ms, ease-out)
Exit:       opacity: 0, x: -20 (150ms, ease-in)
```

### Notification Badge
```
Enter:      scale: 0 → 1 (200ms, ease-spring)
```

### Loading States
```
Spinner:    animate-spin (linear, 1s)
Skeleton:   pulse animation (opacity 0.5→1, 2s, infinite)
```

## Estados de Hover

| Elemento | Transición | Propiedad |
|----------|-----------|-----------|
| Button | 100ms ease-default | `brightness`, `background-color` |
| Card clickeable | 200ms ease-default | `border-color`, `box-shadow` |
| Sidebar nav | 150ms ease-default | `background-color` |
| Table row | 150ms ease-default | `background-color` |
| Input | 150ms ease-default | `border-color`, `box-shadow` |

## Estados de Focus

Todos los elementos interactivos usan `focus-visible:ring-2 ring-ring` con transición de 150ms.

## Loading States

### Skeleton
```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
.skeleton {
  animation: skeleton-pulse 2s ease-in-out infinite;
  border-radius: var(--radius-lg);
  background: var(--color-muted);
}
```

### Spinner
Usar `<Loader2 className="animate-spin" />` de lucide-react.

## Reglas

1. No usar `transition-all` — especificar qué propiedades animar
2. No crear animaciones decorativas sin propósito funcional
3. Preferir duraciones cortas (< 300ms) para UI, reservar las largas para page transitions
4. No animar elementos que ya no son visibles (usar AnimatePresence)
5. `prefers-reduced-motion: reduce` → duración 0 en todas las animaciones
