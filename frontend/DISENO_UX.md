# D' Yiya — Manifiesto de Diseño UX

---

## FASE 1 — Autopsia de 7 POS

### Square POS
- **Modo por rol**: FSR, QSR, Bar — cada uno con layout distinto.
- **Real Time Check View**: panel izquierdo = config item, derecho = carrito vivo.
- **Floor plan as home**: la pantalla principal es el mapa de mesas.
- **Dark mode**: toggle para bares/poca luz.
- **Color**: b/n con azul como único acento. Sin ruido visual.
- **Offline mode**: acepta pagos sin internet hasta 24h.

### Toast POS
- **Order flow end-to-end**: pedido → cocina → entregado. Todo conectado.
- **KDS con temporizadores**: tickets entran, se cronometran, cambian de color si tardan.
- **Split checks flexible**: por artículo, por asiento, en partes iguales.
- **Role-specific UI**: host, server, bartender, cook — cada uno ve lo suyo.

### Shopify POS
- **Cart-first**: el carrito es el centro de todo. No desaparece nunca.
- **Unified commerce**: online y offline comparten inventario en tiempo real.
- **Smart search**: buscar productos sin navegar categorías.
- **Customer context**: perfil del cliente siempre accesible desde la orden.

### Oracle Micros (Simphony)
- **Enterprise permissions**: granularidad extrema de roles.
- **Order lifecycle**: estados muy definidos del pedido.
- **Complejo**: criticado por su curva de aprendizaje. Lección: la simplicidad gana.

### Clover POS
- **App marketplace**: extensible. No necesitas todo de entrada.
- **Icon-driven UI**: iconos grandes como navegación principal.
- **Payment-first**: diseñado para cobrar rápido.

### Lightspeed Restaurant
- **iPad-optimized**: todo el diseño pensado para tablet.
- **Drag-and-drop menu**: editar menú visualmente.
- **Visual analytics**: reportes como gráficos, no tablas.

### TouchBistro
- **iPad-native**: no es web adaptada, es app desde cero.
- **Offline mode**: diseñado para funcionar sin internet.
- **Simple split payments**: dividir cuentas es trivial.

---

## FASE 2 — Principios Universales Extraídos

### PRINCIPIOS ESTRUCTURALES

1. **CONTEXTO PERMANENTE**
   - El carrito/tab nunca desaparece de la pantalla.
   - El total es siempre visible.
   - La mesa/cliente activo se muestra siempre.
   
2. **JERARQUÍA VISUAL CLARA**
   - El estado (libre/ocupado/cuenta) se comunica con color, no con texto.
   - Las acciones primarias tienen el doble de tamaño que las secundarias.
   - Los datos numéricos (precio, cantidad, tiempo) usan tipografía tabular.

3. **NAVEGACIÓN POR ROL**
   - Cada rol ve exactamente lo que necesita. Ni un botón más.
   - Admin ve todo. Waitress ve mesas + orden. Cook ve cocina.

4. **TOUCH-FIRST**
   - Mínimo 48px de área táctil.
   - Espaciado de 8px entre elementos interactivos.
   - Sin hover states que oculten acciones (no hay ratón en POS).

5. **FEEDBACK INSTANTÁNEO**
   - Cada tap produce cambio visual en <100ms.
   - Las operaciones asíncronas tienen estado optimista.
   - Error = toast + vibración (si hay haptic).

### PRINCIPIOS DE FLUJO

6. **3-TAP MAX**
   - Una mesa se ocupa en 1 tap.
   - Un item se agrega en 2 taps (categoría → item).
   - Se cobra en 3 taps (cuenta → método → confirmar).

7. **PREVENCIÓN DE ERRORES**
   - No se puede cerrar una orden vacía.
   - No se puede enviar a cocina sin items.
   - Confirmación explícita para acciones destructivas (void, descartar).

8. **OFFLINE PRIMERO**
   - La interfaz funciona completa sin internet.
   - Solo ciertas acciones (pago con tarjeta, e-CF) se bloquean.
   - El estado de conexión es siempre visible.

9. **CATEGORÍAS SIEMPRE VISIBLES**
   - Como pestañas horizontales fijas.
   - Sin scroll horizontal infinito — máximo 7 categorías visibles.
   - La categoría activa tiene indicador claro.

---

## FASE 3 — D' Yiya: Una Evolución, No Una Copia

### Personalidad

D' Yiya no es un POS genérico. Es un POS dominicano. Eso significa:

- **Luz tropical**: alto contraste, nada de grises claros ilegibles bajo el sol.
- **Cálido pero profesional**: los acentos de color son cálidos (arena, coral, sol) pero el fondo es blanco limpio — no tropical artificial.
- **Directo**: el mesero no tiene tiempo para animaciones largas. Todo es rápido, seco, eficiente.
- **Con personalidad**: el logo D' Yiya no es un icono genérico. Es parte de la interfaz. La marca se siente.

### Diferenciadores Clave vs Square

| Aspecto | Square | D' Yiya |
|---------|--------|---------|
| Público | USA, multi-industria | RD, restaurantes |
| Offline | 24h pagos offline | Cash offline, CardNET requiere internet |
| Comprobante | Recibo físico | e-CF + WhatsApp |
| Precios | Fijos | Precio del día (pescados, mariscos) |
| ITBIS | Tax estándar | ITBIS 18%, propina opcional |
| e-CF | No aplica | Requerido por DGII Ley 32-23 |
| Idioma | Inglés | Español dominicano |
| Dispositivo | Hardware propio (Register, Terminal) | PWA en tablets/Celulares del mesero |

### Qué Hace Único a D' Yiya

1. **Precio del día visible desde el item card** — no hay que entrar al item para verlo.
2. **e-CF integrado en el flujo de cobro** — no es un paso aparte.
3. **WhatsApp como canal de receipt** — el cliente recibe su factura por WhatsApp.
4. **PIN-only para meseros** — sin email/contraseña, solo 4 dígitos.
5. **Modo sol** — alto contraste para exteriores.
6. **Sin hardware especial** — corre en cualquier tablet o teléfono como PWA.

---

## FASE 4 — Validación de Componentes

Cada componente debe responder SÍ a todas estas preguntas:

1. ¿Por qué existe?
2. ¿Qué problema resuelve?
3. ¿Reduce clics respecto a la alternativa?
4. ¿Reduce errores?
5. ¿Puede usarse con una mano?
6. ¿Puede entenderlo alguien sin entrenamiento en <3 segundos?
7. ¿Comunica su estado sin texto? (color/posición/icono)

### Validación de Componentes Existentes

**TableCard**
- Existe para: representar una mesa físicamente.
- Problema: el mesero necesita saber estado y tiempo de cada mesa de un vistazo.
- Reduce clics: SÍ (1 tap para abrir orden).
- Reduce errores: SÍ (color indica estado, no hay ambigüedad).
- 1 mano: SÍ (tarjeta táctil grande).
- 3 segundos: SÍ (número grande + color + tiempo).
- Estado sin texto: SÍ (verde=libre, ámbar=ocupada, roja=cuenta).

**MenuItemCard**
- Existe para: agregar items a la orden.
- Problema: el mesero necesita ver nombre, precio, disponibilidad y precio del día de un vistazo.
- Reduce clics: SÍ (tap directo agrega, no hay carrito intermedio).
- Reduce errores: SÍ (sold out se ve, precio del día se ve).
- 1 mano: SÍ.
- 3 segundos: SÍ (icono, nombre, precio, badge HOY).
- Estado sin texto: SÍ (opacidad=sold out, badge HOY visible).

**CartPanel**
- Existe para: ver y modificar la orden actual.
- Problema: el mesero necesita confirmar qué lleva la orden antes de enviar a cocina o cobrar.
- Reduce clics: SÍ (ver items, modificar cantidades, quitar items sin ir a otra pantalla).
- Reduce errores: SÍ (ver total acumulado evita errores de cobro).
- 1 mano: con scroll SÍ.
- 3 segundos: SÍ (lista de items + total).
- Estado sin texto: el total debería ser más prominente.

**AppShell/Nav**
- Existe para: cambiar entre módulos (mesas, cocina, dashboard, ajustes).
- Problema: el usuario necesita navegar sin perderse.
- Reduce clics: SÍ (1 tap para cambiar módulo).
- Reduce errores: SÍ (solo muestra módulos del rol).
- 1 mano: SÍ (bottom nav alcance pulgar).
- 3 segundos: SÍ.

**LoginPage**
- Existe para: autenticar usuario.
- Problema: el mesero necesita entrar rápido con PIN.
- Reduce clics: modo PIN directo desde la pantalla de login.
- Reduce errores: dots de PIN evitan errores de digitación, enter automático al completar.
- 1 mano: SÍ (keypad numérico).
- 3 segundos: SÍ.

---

## FASE 5 — Ecosistema Completo

### Layout General (App Shell)

```
┌──────────────────────────────────────────┐
│  HEADER (44px)                          │
│  [🄳 Logo]                [🌐] [👤 Nombre] │
├──────────────────────────────────────────┤
│                                          │
│   CONTENT (flex-1, scroll)              │
│                                          │
│   ← Cada página va aquí →                │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│  BOTTOM NAV (56px, 2-4 tabs según rol)  │
│  [Mesas] [Cocina] [Dashboard] [Ajustes]  │
└──────────────────────────────────────────┘
```

### Mapa de Navegación

```
Login ──→ Tables ──→ Order ──→ Checkout ──→ (feedback toast)
            │                      │
            ├──→ Kitchen           └──→ e-CF queue
            │
            ├──→ Dashboard
            │
            └──→ Settings
```

### Flujo de Orden Completo

```
1. Mesero ve floor plan (TablesPage)
   → Tap en mesa libre
   
2. Se abre OrderPage con menú izquierdo y carrito derecho
   → Tap en categoría (scroll horizontal fijo arriba)
   → Tap en item → se agrega instantáneamente al carrito
   → Tap en item con modificadores → modal de modificadores
   
3. Cuando la orden está lista:
   → Tap "Enviar a cocina" (botón grande abajo del carrito)
   → Feedback: carrito se limpia, items pasan a "enviados"
   
4. Cuando el cliente pide cuenta:
   → Tap "Pedir cuenta"
   → Mesa pasa a estado "cuenta"
   
5. En checkout:
   → Ver total, ITBIS, items
   → Seleccionar método de pago
   → Si e-CF: ingresar RNC + WhatsApp
   → Confirmar pago
   → Mesa vuelve a libre
```

### Estados de Mesa (Sistema de Color)

| Estado | Color | Símbolo | Acción posible |
|--------|-------|---------|----------------|
| Libre | Verde | — | Tap → crear orden |
| Ocupada | Ámbar | Timer | Tap → continuar orden |
| Cuenta | Rojo | Badge "$" | Tap → ir a checkout |
| Reservada | Azul | — | (futuro) |

### Layout de OrderPage (Split View)

```
┌─────────────────────┬──────────────────────┐
│ MENÚ (60%)          │ CARRITO (40%)        │
│                     │                      │
│ [Categorías]        │ Mesa #5 │ 2 comens.  │
│ scroll horizontal   │                      │
│                     │ ┌──────────────────┐ │
│ ┌─────┐ ┌─────┐    │ │ Item     3x $150 │ │
│ │Item │ │Item │    │ │ Item     1x $200 │ │
│ └─────┘ └─────┘    │ │ Modif.     +$30  │ │
│ ┌─────┐ ┌─────┐    │ └──────────────────┘ │
│ │Item │ │Item │    │                      │
│ └─────┘ └─────┘    │ Total:      $680     │
│                     │                      │
│                     │ [Enviar a cocina]    │
│                     │ [Pedir cuenta]       │
└─────────────────────┴──────────────────────┘
```

---

## FASE 6 — Sistema de Movimiento

### Reglas de Animación

1. **Duración base: 200ms**
   - Nada más lento que 300ms (ritmo de restaurante, no de app bancaria).
   - Nada más rápido que 100ms (debe ser perceptible).

2. **Easing: ease-out siempre**
   - Sin easings elásticos o rebotes. Son POS, no juguete.
   - `cubic-bezier(0.16, 1, 0.3, 1)` — rápido al inicio, suave al final.
   - Inspirado en Material Design, pero más seco.

3. **Movimiento por propósito**

| Evento | Animación | Duración | Easing | Por qué |
|--------|-----------|----------|--------|---------|
| Item agregado al carrito | Scale-in (0.9→1) + fade | 150ms | ease-out | Confirmación instantánea |
| Item removido del carrito | Fade-out + slide-right | 150ms | ease-in | Desaparece limpiamente |
| Mesa cambia de estado | Background color transition | 200ms | ease-out | El color comunica el cambio |
| Navegación entre tabs | Slide content (no tabs) | 200ms | ease-out | La pestaña no se mueve, el contenido sí |
| Modal de modificadores | Scale-in from center | 200ms | ease-out | Aparece sin desorientar |
| Toast de notificación | Slide-in from top | 250ms | ease-out | Notifica sin interrumpir |
| Badge numérico (carrito) | Scale pulse (1→1.2→1) | 200ms | ease-out | Atrae atención al cambio |
| Apertura de carrito | Slide-in-right | 200ms | ease-out | Viene del borde natural |
| Cierre de carrito | Slide-out-right | 150ms | ease-in | Rápido al salir |
| Alerta de tiempo (30min) | Pulse infinito en dot | 1s cycle | — | Urgencia sin parpadeo molesto |
| Offline/Online | Icon fade transition | 300ms | ease-out | Cambio suave de estado |

4. **No animar:**
   - Scroll de lista de items (es acción del usuario).
   - Tap de botón primario (solo change de estado).
   - Transiciones de página completas (son instantáneas).

5. **Animaciones condicionales**
   - Si el usuario está en modo "alta velocidad" (>5 taps en 10s), desactivar animaciones.
   - Si el dispositivo es <4GB RAM, usar transiciones CSS, no Framer Motion.

---

## FASE 7 — Listo para Código

Este documento es el plano. Cada componente, cada animación, cada layout está definido.

Principios no negociables:
1. Carrito nunca desaparece durante una orden.
2. Total siempre visible.
3. 3 taps max para cualquier acción.
4. Color comunica estado, no decora.
5. Sin hover states que oculten acciones.
6. Las animaciones duran max 200ms.
7. La interfaz funciona completa en offline (excepto pagos electrónicos y e-CF).

El diseño es de D' Yiya. No se parece a Square. No se parece a Toast.
Es rápido, es dominicano, es para el sol de Samaná.
