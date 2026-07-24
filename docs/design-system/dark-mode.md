# Dark Mode — D'Yiya Restaurant's Design System

## Estrategia

El sistema usa **class-based theming**: el tema se controla mediante las clases `.dark` y `.light` en el elemento `<html>`. No se usa `@media (prefers-color-scheme)` para evitar conflictos con la selección manual del usuario.

## Implementación

### HTML
```html
<html class="dark">  <!-- o "light" -->
```

### CSS
```css
:root, :root.dark {
  /* Valores para dark mode + fallback */
}

:root.light {
  /* Valores para light mode */
}
```

### Script de bootstrap (index.html)
```javascript
document.documentElement.className = localStorage.getItem('theme') || 'dark';
```

Este script se ejecuta en el `<head>` antes del render para evitar FOUC.

## Mapeo de Colores

Ver tabla completa en [`colors.md`](colors.md) → Asignación Temática.

Resumen:

| Rol | Dark | Light |
|-----|------|-------|
| Fondo | Azul Petróleo 900 | Marfil 50 |
| Card | Azul Petróleo 800 | Marfil 50 |
| Primary | Azul Petróleo 400 | Azul Petróleo 600 |
| Accent | Dorado Champán 400 | Dorado Champán 500 |
| Border | Azul Petróleo 600 | Arena 200 |
| Texto ppal | Marfil 100 | Azul Petróleo 900 |
| Texto muted | Azul Petróleo 400 | Arena 600 |

## Sombras en Dark Mode

Las sombras en dark mode tienen mayor opacidad porque el fondo oscuro las absorbe:

```css
:root, :root.dark {
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.15);
}
:root.light {
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.05);
}
```

## Consideraciones Especiales

### Input backgrounds
- Dark: Azul Petróleo 700 (más claro que el fondo 900 para destacar)
- Light: Marfil 100 (apenas más oscuro que el fondo 50)

### Sidebar
- Dark: Azul Petróleo 950 (más oscuro que el fondo 900 para crear contraste)
- Light: Arena 50 (más cálido que el fondo blanco)

### Modales
- Backdrop: `bg-black/40` en ambos modos (suficiente oscurecimiento)

### Gráficos (Charts)
Los colores de segmentos deben adaptarse al tema activo:
```typescript
fill: 'var(--color-primary)',
fill: 'var(--color-accent)',
fill: 'var(--color-destructive)',
// No usar valores fijos como #ef4444
```

### Imágenes y Assets
- Preferir PNG/SVG con fondo transparente para que se adapten a ambos modos
- Si una imagen tiene fondo blanco, agregar borde sutil en dark mode

## Toggle de Tema

El botón de cambio de tema está en el Header:
- Icono: `Sun` (dark→light) / `Moon` (light→dark)
- Acción: alternar clase en `<html>` + persistir en `localStorage`
- Sin animación de transición global (puede causar parpadeo)

## Accesibilidad

- **Contraste**: verificar WCAG AA en ambos modos (ver tabla en colors.md)
- **Focus rings**: siempre visibles en ambos modos (`ring-ring` se adapta al tema)
- **No depender del color solo**: usar iconos + texto + color para estados críticos
- **Imágenes**: no usar imágenes con texto incrustado (no se adaptan al modo)
