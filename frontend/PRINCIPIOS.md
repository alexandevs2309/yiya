# D' Yiya — Principios de Diseño con Base Científica

## Psicología Cognitiva

| Principio | Aplicación |
|-----------|-----------|
| **Carga cognitiva mínima** | Ninguna pantalla exige recordar información entre vistas. El carrito siempre está visible. El total siempre visible. |
| **Reconocimiento sobre recuerdo** | Los items del menú se muestran con nombre + precio + ícono. No hay que memorizar códigos ni referencias. |
| **Efecto de posición serial** | El primer y último elemento de cada lista son los que mejor se recuerdan. Las categorías críticas van al inicio. La acción principal va al final (thumb zone). |
| **Memoria icónica** | El color y el ícono se procesan 60,000x más rápido que el texto. El estado de cada mesa se comunica con color + ícono, no con palabras. |

## Ergonomía (Fitts' Law)

> Tiempo = a + b · log₂(distancia / tamaño + 1)

| Regla | Aplicación |
|-------|-----------|
| **Botones grandes cerca del pulgar** | Acciones principales en ZONA 3 (mitad inferior): Enviar a cocina, Pagar, Marcar listo. Altura mínima 48px. |
| **Zona 1 (arriba)** | Solo información y navegación secundaria (back, categorías). |
| **Zona 2 (medio)** | Exploración (grid de items, lista de órdenes). |
| **Zona 3 (abajo, thumb zone)** | Acciones críticas. Botones de 48-56px de altura. |
| **Distancia de safety** | Acciones destructivas (void, eliminar) están lejos de acciones primarias para prevenir errores. |
| **Steering law** | Espacio mínimo de 8px entre botones adyacentes para evitar taps accidentales. |

## Hick's Law

> Tiempo de decisión = a + b · log₂(n)

| Regla | Aplicación |
|-------|-----------|
| **Máximo 7±2 opciones por nivel** | Categorías visibles: máximo 7 en la barra. Si hay más, se agrupan. |
| **Métodos de pago: 3** | Efectivo, CardNET, Transferencia. No más. |
| **Propinas: 4 opciones** | Sin, 10%, 15%, 18%. Suficiente. |
| **Chunking** | Items agrupados por categoría. Órdenes agrupadas por mesa. |

## Gestalt

| Principio | Aplicación |
|-----------|-----------|
| **Proximidad** | Total + botón de pago están juntos (relacionados). Items + su precio están juntos. |
| **Semejanza** | Todos los botones de "agregar" se ven igual. Todas las mesas del mismo estado se ven igual. |
| **Figura-fondo** | El carrito es figura sobre fondo blanco. Los items late son figura sobre fondo rojo. |
| **Destino común** | Los items que entran al carrito animan juntos (se perciben como grupo). |
| **Simetría** | El total en checkout está centrado (comunica estabilidad, confianza). |

## Nielsen's 10 Heuristics

| # | Principio | Aplicación |
|---|-----------|-----------|
| 1 | **Visibilidad del estado** | Timer en cocina siempre visible y actualizado. Estado de cada mesa visible por color. Toast en cada acción. |
| 2 | **Coincidencia mundo real** | "Mesa", "comensales", "cocina", "cuenta". Lenguaje de restaurante, no de base de datos. |
| 3 | **Control y libertad** | Se puede quitar cualquier item del carrito. Acción destructiva requiere confirmación (implícita: el botón cambia a tacho). |
| 4 | **Consistencia** | Mismo color = mismo estado en toda la app. Misma posición para acciones similares. |
| 5 | **Prevención de errores** | No se puede enviar carrito vacío. No se puede cobrar sin método. RNC validado en entrada. |
| 6 | **Reconocimiento** | Items del menú siempre visibles con precio. No hay que recordar nada. |
| 7 | **Flexibilidad** | PIN es más rápido que usuario/contraseña. Modo PIN es el default. |
| 8 | **Diseño minimalista** | Cada píxel tiene propósito. Sin decoración. Sin sombras gratuitas. |
| 9 | **Recuperación de errores** | Mark-ready es optimista (cambia UI, revierte si falla). Error toast con descripción. |
| 10 | **Ayuda** | No se necesita manual. Cada pantalla se explica sola. |

## Material Motion

| Principio | Aplicación |
|-----------|-----------|
| **Responsive** | Touch feedback en <100ms. Item aparece en carrito en 150ms. |
| **Natural** | Curva cubic-bezier(0.16, 1, 0.3, 1). Aceleración rápida, desaceleración suave. Sin rebotes elásticos. |
| **Aware** | Item nuevo en carrito: aparece con fade-in (entra). Item removido: fade-out + slide-right (sale). Coordinado. |
| **Intentional** | El total solo anima cuando cambia (pulse de confirmación). No anima sin razón. |
| **Elevación** | Card = 1dp. Nav = 4dp. Modal = 8dp. Cada sombra comunica profundidad jerárquica. |

## Elevación (sombras con propósito)

| Componente | Elevación | Shadow | Por qué |
|-----------|-----------|--------|---------|
| TableCard, MenuItemCard | 0dp | Sin sombra | El borde ya comunica interactividad. Sin elevación gratuita. |
| CartPanel | 0dp | Sin sombra | Misma superficie que el contenido. Separado por borde. |
| Bottom Nav | 4dp | `shadow-nav` | Está por encima del contenido. Elevación suficiente para destacar. |
| Modal | 8dp | `shadow-modal` | Por encima de todo. Señal clara de que está en otra capa. |
| Toast | 12dp | `shadow-toast` | Lo más alto (notificación urgente). |
| Botón primario (resting) | 1dp | `shadow-card` | Sutil indicación de que es táctil. |
| Botón primario (pressed) | 0dp | Sin sombra | Se hunde al presionar. Feedback táctil. |
