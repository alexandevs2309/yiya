# D'Yiya POS — Especificación Maestra del Producto

Este es el documento que faltaba: no arquitectura, no fragmentos — el
producto completo, de punta a punta, partiendo de cero. Todo lo demás
(AGENTS.md, planes de fases, prompts) se deriva de esto.

---

## 1. Qué es D'Yiya POS, en una frase

Sistema de punto de venta premium para restaurante de mariscos en
Samaná, RD — nivel Toast/Lightspeed en experiencia, con cumplimiento
fiscal dominicano nativo (e-CF, ITBIS, propina de ley) que ningún
competidor internacional tiene.

---

## 2. Hardware — qué equipos y por qué

### Día 1 (confirmado contigo)
| Equipo | Rol | Requerimiento mínimo |
|---|---|---|
| 1 computadora | Servidor + caja/cajero | Windows 10/11, 8GB RAM, SSD, Ethernet preferido |
| 1 tablet | Mesero — toma de órdenes | Android 10+, 4GB RAM, pantalla 10" recomendada |
| 1 monitor/tablet en cocina | KDS — pantalla de cocina | Cualquier pantalla con navegador, montada fija |
| 1 impresora térmica | Comandas + cuentas | USB o LAN, 80mm, ESC/POS — modelo a definir por cliente |
| Router/Wi-Fi local | Red interna del restaurante | Cualquiera — no depende de internet para operar |

### Diseñado para crecer sin reescribir nada
La arquitectura (Django sirviendo HTTP/WebSocket en la red local) permite
agregar más adelante: una segunda tablet de mesero, una pantalla de barra
separada del KDS de cocina, o una segunda impresora — todo conectándose
a la misma computadora central por Wi-Fi, sin cambios de código. Esto
es importante para que la inversión de hoy no quede obsoleta si el
restaurante crece o el cliente decide expandirse a un segundo local.

### Lo que NO necesita el cliente
- Servidor dedicado aparte de la computadora de caja
- Internet de alta velocidad — solo conexión básica para e-CF
- Hardware Apple/iPad — todo corre en navegador, compatible con
  tablets Android genéricas de bajo costo

---

## 3. Stack técnico definitivo

| Capa | Tecnología | Por qué |
|---|---|---|
| Backend | Django 5 + DRF + Channels | Admin panel gratis, auth/permisos resueltos, tu experiencia previa |
| Base de datos | PostgreSQL nativo en Windows | Concurrencia real sin configuración especial, sin Docker |
| WebSockets (KDS tiempo real) | Django Channels + InMemoryChannelLayer | Sin necesitar Redis — todo vive en un proceso |
| Tareas en background (e-CF) | Tabla propia en PostgreSQL + worker interno | Sin Celery, sin broker externo |
| Frontend | React 19 + TypeScript + Vite | Tipado fuerte, ecosistema maduro |
| Estilos | TailwindCSS + shadcn/ui | Look premium consistente, rápido de mantener |
| Animaciones | Framer Motion | Las micro-interacciones que hacen sentir "premium" |
| Offline | PWA + Service Worker + IndexedDB | Operación sin internet real, no solo de palabra |
| Despliegue | Servicios nativos de Windows (NSSM) | Sin Docker — menos piezas, menos puntos de fallo |
| Impresión | python-escpos | Estándar de la industria para impresoras térmicas |
| Facturación | Alanube/ef2 → DGII e-CF | Único proveedor relevante para cumplimiento fiscal RD |

---

## 4. Módulos completos — el alcance "todo premium" que pediste

### M1 — Front of House (POS)
- Plano de salón visual con colores por tiempo transcurrido (verde/ámbar/rojo)
- Toma de orden con catálogo visual (fotos, categorías con color)
- Modificadores en cascada (preparación, porción, extras) con drawer animado
- Split check — dividir cuenta por ítem, partes iguales, o monto fijo
- Búsqueda rápida ⌘K de productos
- Favoritos por mesero

### M2 — Back of House (Cocina/KDS)
- Pantalla de cocina en tiempo real vía WebSocket
- Temporizadores visuales por comanda (verde → ámbar → rojo parpadeante)
- Filtro de barra para bartender (solo bebidas)
- Alertas TTS por voz ("Mesa 6, langosta lista") vía Web Speech API
- Impresión automática de comanda al enviar a cocina

### M3 — Caja y Cierre
- Apertura/cierre de turno con fondo fijo configurable
- Arqueo de caja con desglose por método de pago
- Propinas acumuladas automáticamente por mesera (10% ley + voluntaria)
- Impresión de cuenta final con desglose ITBIS + propina

### M4 — Facturación Electrónica (e-CF)
- Emisión de e-CF vía Alanube/ef2, asíncrona, sin bloquear el cobro
- Validación de RNC en tiempo real (algoritmo Módulo 11)
- Nota de Crédito electrónica (tipo 04) para anulaciones
- Consola de reenvíos manuales para documentos fallidos
- Envío del NCF al cliente por WhatsApp

### M5 — Panel de Administración
- CRUD de menú, mesas, usuarios, roles y permisos
- Precio variable diario para mariscos (`price_today`)
- Panel de auditoría — quién hizo qué y cuándo

### M6 — Reportes y Analytics
- Dashboard en tiempo real: ventas del día, ticket promedio, velocidad de cocina
- Ranking de platos más vendidos
- Reportes fiscales 606 (compras) y 607 (ventas) en formato DGII real
- Ingeniería de menú — qué platos son rentables y cuáles cortar

### M7 — Experiencia del Comensal (QR Ordering)
- QR único por mesa — el comensal escanea, ve el menú con fotos, ordena
- La orden llega directo al KDS, el mesero solo confirma
- Perfil básico del comensal — historial de visitas, alergias, platos favoritos

### M8 — Infraestructura y Resiliencia
- Modo offline real — toda la operación funciona sin internet
- Sync queue visible — el cajero ve qué está pendiente de sincronizar
- Servicios nativos de Windows con reinicio automático
- Backup nocturno opcional a la nube

### M9 — UX Samaná (diferenciador local)
- Modo Sol — alto contraste para tablets en terraza bajo luz solar directa
- Feedback háptico en confirmaciones (tablet)
- Onboarding rápido para personal nuevo

---

## 5. UI/UX — qué se siente al usar el sistema

### Identidad visual
- Paleta: dark theme principal (operación nocturna/interior), modo sol alternativo (terraza diurna)
- Tipografía: sans-serif de sistema, mínimo 14px normal / 18px modo sol
- Iconografía: un solo set consistente (Tabler), nunca mezclado
- Fotos de platos: fondo transparente, mínimo 400×400px, estilo editorial

### Principios de interacción
- Regla de 3 toques máximo para cualquier acción frecuente
- Transiciones de pantalla ≤150ms — nada que frene al mesero en hora pico
- Botones táctiles mínimo 44×44px — uso con dedos bajo presión
- Skeleton loaders — nunca pantalla blanca mientras carga
- Confirmaciones sutiles (toast 2 segundos, esquina), nunca modales bloqueantes para acciones simples

### Lo que el cliente ve al entrar al sistema
Un ícono en su escritorio. Doble click. El sistema abre en pantalla
completa, sin barra de navegador, indistinguible de una aplicación
nativa instalada. Nunca ve la palabra "Django", "PostgreSQL", "Docker"
ni ninguna pieza técnica.

---

## 6. Qué lo diferencia de Square, Toast, Lightspeed

Ninguno de los grandes sistemas internacionales opera en República
Dominicana. Esto no es una ventaja menor — es la razón de ser del
producto:

- e-CF DGII nativo (Ley 32-23) — ningún competidor internacional lo tiene
- Propina de ley 10% calculada y repartida automáticamente — exclusivo dominicano
- CardNET integrado — Square/Toast usan Stripe, no disponible en RD
- Precios variables de mariscos (`price_today`) — pensado para negocio pesquero real
- Modo Sol para terrazas tropicales — UX pensada para el clima del Caribe
- Operación 100% offline real — pensado para zonas turísticas con internet inestable
- Español dominicano nativo en toda la interfaz, no traducción genérica

---

## 7. Lo que NO incluye v1 (para que quede explícito, no implícito)

- Multi-sucursal / multi-restaurante (reservado con `tenant_id`, no activo)
- Módulo de inventario de perecederos (fuera de scope v1)
- Sistema de reservaciones con WhatsApp (v2)
- App nativa de iOS/Android — todo es PWA vía navegador
- Integración con apps de delivery (Uber Eats, etc.) — no mencionado, fuera de v1
- Sugerencias por IA / motor de recomendaciones — v2

---

## 8. Cómo arrancamos en código — sin asumir nada previo

Como confirmaste que arrancamos de cero (no hay código previo real que
auditar), el primer prompt para OpenCode NO es una auditoría — es la
inicialización del proyecto desde este documento.

**Primer prompt real para OpenCode:**
```
Vamos a inicializar el proyecto D'Yiya POS desde cero. Te adjunto este
documento de especificación maestra (DYIYA_SPEC_MAESTRA.md) como
contexto completo del producto.

Primero, antes de escribir ningún modelo o vista:

1. Genera la estructura de carpetas completa para backend (Django apps)
   y frontend (React), siguiendo las convenciones que ya describimos
   en AGENTS.md
2. Configura el proyecto Django inicial: settings divididos en
   base/dev/prod, configuración de Channels con InMemoryChannelLayer,
   conexión a PostgreSQL
3. Configura el proyecto React inicial: Vite + TypeScript + Tailwind +
   shadcn/ui, con la estructura de carpetas de AGENTS.md
4. NO implementes modelos de negocio todavía (Order, Table, MenuItem,
   etc.) — eso viene en el siguiente prompt, módulo por módulo,
   empezando por M1 (Front of House).

Confírmame cuando esto esté listo y dame instrucciones de cómo correr
ambos proyectos localmente para verificar que arrancan sin errores.
```

A partir de ahí, vamos módulo por módulo (M1, M2, M3...) con un prompt
específico cada uno, en el orden de prioridad que definamos juntos —
probablemente M1 → M2 → M3 → M8 (offline) antes que M4-M9, porque sin
eso el restaurante no puede operar el día a día.

---

## Lo que sigue pendiente de tu parte

Este documento resuelve "qué construimos y cómo se ve" — pero la
conversación de precio, plazo, y si puedes reutilizar el código con
otros restaurantes sigue sin resolverse. Con "todo premium desde v1"
como alcance, esa conversación se vuelve aún más urgente: este es un
proyecto de varias semanas de trabajo real, no algo que se entrega en
días.