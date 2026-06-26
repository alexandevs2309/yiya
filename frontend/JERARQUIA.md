# Jerarquía Visual de D' Yiya

Cada pantalla organizada por niveles de importancia.
Nunca alfabéticamente. Nunca por comodidad del programador.

---

## LOGIN

| Nivel | Elemento | Qué comunica |
|-------|----------|-------------|
| N1 | Keypad numérico 0-9 | Cómo entro |
| N1 | Dots de PIN (4) | Cuánto llevo digitado |
| N2 | Botón "Entrar" (activo solo con 4 dígitos) | Ya puedo entrar |
| N2 | Tab PIN / Usuario | Cómo prefiero autenticarme |
| N3 | Logo D' Yiya | Dónde estoy |
| N3 | Nombre del restaurante | Contexto |
| N4 | Copyright | Legal |

---

## TABLES (Floor Plan)

| Nivel | Elemento | Qué comunica |
|-------|----------|-------------|
| N1 | Número de mesa (grande) | Identificador |
| N1 | Color de fondo/borde | Estado: verde=libre, ámbar=ocupada, roja=cuenta |
| N2 | Tiempo de ocupación | Urgencia |
| N2 | Badge "TARDE" (>30min) | Alerta |
| N3 | Nombre de zona | Contexto espacial |
| N3 | Cantidad de mesas libres | Panorama rápido |
| N4 | Badge de conectividad | Estado técnico |

---

## ORDER — Panel Izquierdo (Menú)

| Nivel | Elemento | Qué comunica |
|-------|----------|-------------|
| N1 | Items disponibles con precio | Qué puedo vender |
| N1 | Badge "Hoy" (precio del día) | Oferta especial |
| N2 | Categorías (tabs horizontales) | Cómo navego el menú |
| N2 | Nombre del item | Qué es |
| N2 | Precio | Cuánto cuesta |
| N3 | Descripción del item | Detalle |
| N3 | Badge de modificadores (+N) | Personalizable |
| N4 | Precio base tachado (vs precio del día) | Comparativa |

---

## ORDER — Panel Derecho (Carrito)

| Nivel | Elemento | Qué comunica |
|-------|----------|-------------|
| N1 | Items agregados (qué lleva la orden) | Qué ya pedí |
| N1 | TOTAL (más grande que cualquier otro texto) | Cuánto debo cobrar |
| N1 | Botón "Enviar a cocina" | Próxima acción crítica |
| N2 | Cantidad de cada item | Cuántos |
| N2 | Precio por item | Costo individual |
| N3 | Modificadores y notas | Personalización |
| N3 | Selector de comensales | Para cobro dividido |
| N3 | Botón "Pedir cuenta" | Acción secundaria |
| N4 | Subtotal, ITBIS | Desglose |
| N4 | Badge de conectividad offline | Estado técnico |

---

## KITCHEN

| Nivel | Elemento | Qué comunica |
|-------|----------|-------------|
| N1 | Items pendientes (nombre + cantidad) | Qué cocinar |
| N1 | Temporizador (minutos desde que entró) | Urgencia |
| N1 | Alerta visual si >15min | Ya está tardando |
| N1 | Botón ✓ (marcar listo) | Acción principal |
| N2 | Número de mesa | De quién es |
| N2 | Modificadores y notas | Cómo prepararlo |
| N3 | Badge "Cuenta" (si aplica) | Contexto |
| N4 | Cantidad de comandas activas | Panorama |

---

## CHECKOUT

| Nivel | Elemento | Qué comunica |
|-------|----------|-------------|
| N1 | TOTAL a cobrar (enorme) | Cuánto es |
| N1 | Botones de método de pago | Cómo cobrar |
| N2 | Items de la orden + precios | Qué se cobra |
| N2 | Propina (si aplica) | Costo final |
| N3 | Campos RNC + WhatsApp | Para e-CF |
| N3 | ITBIS desglosado | Impuesto |
| N4 | Número de recibo, fecha | Auditoría |

---

## DASHBOARD

| Nivel | Elemento | Qué comunica |
|-------|----------|-------------|
| N1 | Ventas totales del día | Cuánto se vendió |
| N2 | Cantidad de órdenes | Cuántas mesas pagaron |
| N2 | ITBIS total | Impuesto retenido |
| N3 | Últimas órdenes pagadas | Detalle |
| N4 | Enlaces a mesas, configuración | Navegación admin |

---

## SETTINGS

| Nivel | Elemento | Qué comunica |
|-------|----------|-------------|
| N1 | Nombre del usuario + rol | Quién soy |
| N2 | Secciones (Perfil, Restaurante, etc.) | Qué puedo configurar |
| N3 | Descripción de cada sección | Para qué sirve |
| N4 | Cerrar sesión | Salir |

---

## Reglas de Jerarquía Visual

1. **N1 es 2x el tamaño de N2** — el total es el doble de grande que los items
2. **N1 siempre está en la mitad inferior de la pantalla** (alcance del pulgar) — acciones críticas abajo
3. **N1 usa color negro puro (#000000)** — máximo contraste
4. **N2 usa negro suave (#1C1C1E)**
5. **N3 usa gris medio (#5B5B5E)**
6. **N4 usa gris claro (#8E8E93)**
7. **N1 nunca está oculto** — ni detrás de scroll, ni detrás de hover, ni detrás de modales
8. **El total SIEMPRE es más grande que cualquier otro número en pantalla**
9. **El botón de acción principal SIEMPRE es más grande que cualquier otro botón**
10. **El color comunica estado, no tesela**
