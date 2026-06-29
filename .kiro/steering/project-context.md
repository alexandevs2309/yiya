# D'Yiya POS — Contexto del Proyecto

## ¿Qué es este proyecto?

Sistema POS premium para restaurante de mariscos en Samaná, República Dominicana. Objetivo: nivel Toast POS / Lightspeed. Cada decisión de UX prioriza velocidad operacional bajo presión (salón lleno, viernes 8pm).

## Stack técnico

### Backend
- Django 5 + Django REST Framework
- PostgreSQL (base de datos principal)
- Django Channels + Redis (WebSockets — KDS en tiempo real, sync de mesas)
- Celery + Redis (tareas asíncronas — e-CF, reportes DGII)
- Docker (desarrollo con runserver)

### Frontend
- React (Vite) + TailwindCSS
- Zustand (estado global: carrito, mesa activa, turno)
- React Query (fetching y cache)
- IndexedDB (modo offline — comandas encoladas sin internet)

### Infra / Deploy
- Target: VPS con Docker Compose
- Pendiente: docker-compose.prod.yml con Daphne + Nginx SSL
- Backups a AWS S3 (pendiente)

## Contexto local (República Dominicana)

- Moneda: RD$ (peso dominicano)
- Impuesto: ITBIS 18% sobre subtotal
- Propina: 10% de ley obligatoria (acumular por mesera en turno)
- Facturación electrónica: e-CF DGII vía Alanube/ef2 (pendiente credenciales)
- Reportes fiscales: 606 (compras) y 607 (ventas) en formato DGII
- Validación de RNC: algoritmo Módulo 11 de la DGII
- Conectividad: zona turística con internet inestable → offline-first es crítico
- Hardware: tablets bajo luz solar directa → "Modo Sol" (alto contraste, fuente ≥18px)

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| owner | Todo — configuración, reportes, arqueos, e-CF |
| manager | Turnos, arqueos, reportes, mesas, cocina |
| frontdesk_cashier | POS completo, cobros, impresión, propinas |
| professional (mesero) | Mesas asignadas, órdenes, modificadores |
| bartender | KDS filtrado solo bebidas/barra |

## Estado actual de módulos

| Módulo | % | Estado |
|--------|---|--------|
| M0 Seguridad / Turnos | 100% | ✅ Verificado con tests |
| M1 FOH (POS) | 70% | 🟡 Falta: split check, modificadores, impresión ESC/POS |
| M2 Cocina (KDS) | 70% | 🟡 Falta: TTS, filtro bartender, temporizadores alarma |
| M3 Caja / Arqueo | 80% | 🟡 Falta: propinas por mesera, fondo fijo de caja |
| M4 e-CF Dominicana | 70% | 🟡 Falta: Nota de Crédito tipo 04, validación RNC Módulo 11 |
| M5 Admin Panel | 90% | 🟢 Falta: UI de auditoría de logs |
| M6 Reportes DGII | 0% | 🔴 Mockeado — no genera 606/607 reales |
| M7 Clientes / QR | 0% | 🔴 No iniciado |
| M8 Inventario | 0% | 🔴 Fuera de scope v1 |
| M9 PWA & Infra | 40% | 🟠 Falta: Daphne prod, Nginx, UI de sync offline |
| M10 UX Samaná | 20% | 🔴 Falta: Modo Sol, háptico, NetworkBadge en TopBar |

## Brechas críticas (bloqueantes de producción)

### 🔴 Crítico — no va a producción sin esto
- **Split Check** — endpoint `/api/v1/orders/{id}/split/` + UI en CheckoutPage.tsx
- **Reportes 606/607 DGII** — actualmente mockeados, necesitan generación real en Django
- **Nota de Crédito e-CF tipo 04** — obligatoria por ley al anular facturas firmadas
- **Validación RNC Módulo 11** — frontend (input) + backend (model validator)
- **Propinas por mesera** — acumular 10% ley + propina voluntaria por waitress en turno
- **Docker producción** — docker-compose.prod.yml con Daphne + Nginx + SSL + Redis
- **UI Sync Queue offline** — el cajero no ve qué comandas están encoladas sin internet

### 🟡 Importante — impacta experiencia significativamente
- NetworkBadge existe pero no está renderizado en TopBar.tsx (una línea)
- Filtro de barra en KDS — bartender ve todas las comandas, solo debe ver bebidas
- Modo Sol — tablets en terraza bajo luz solar necesitan alto contraste
- Impresión térmica ESC/POS — actualmente simulada (cliente definirá modelo)
- Consola de reenvíos e-CF fallidos tras 5 reintentos

## Visión premium (diferenciadores v2)

- **Plano de salón vivo** — canvas drag & drop, mesas con colores por tiempo (verde/ámbar/rojo)
- **Modificadores en cascada** — Modifier → ModifierOption con price_delta, drawer en React
- **QR ordering** — comensal escanea QR de mesa, ordena directo a cocina
- **CRM del comensal** — historial de visitas, platos favoritos, alergias, notas del mesero
- **Analytics en tiempo real** — WebSocket al dashboard: ventas del día, ticket promedio
- **Sugerencias AI** — "el 73% de mesas con langosta piden batido de mango"
- **Reservaciones** — confirmación por WhatsApp, asignación de mesa en el plano

## Reglas de desarrollo (SIEMPRE)

### Backend Django
- Toda lógica de negocio va en `services.py` o managers — **nunca en las views**
- Precios siempre en `DecimalField(max_digits=10, decimal_places=2)` — **nunca float**
- ITBIS y propina siempre calculados en backend, nunca en frontend
- Migrations con nombre descriptivo: `0042_add_modifier_option_price_delta`
- Tests obligatorios para: modelos de pago, cálculo de impuestos, endpoints de e-CF

### Frontend React
- Estado de carrito/orden activa siempre en Zustand — **nunca en useState local**
- Todas las llamadas API van por React Query con `staleTime` definido
- Botones táctiles mínimo **44×44px** — operación con dedos bajo presión
- Skeleton loaders en toda pantalla que haga fetch — **nunca pantalla blanca**
- Transiciones de pantalla máximo **150ms** — el mesero no puede esperar
- Textos de interfaz en **español dominicano** (no castellano de España)

### UX / diseño
- Paleta: dark theme principal, modo sol como alternativa
- Grid de 8px estricto
- Iconos: Tabler Outline únicamente — nunca mezclar sets
- Fotos de platos: fondo transparente, mínimo 400×400px
- Fuente mínima en modo producción: 14px normal, 18px modo sol

## Nomenclatura clave

| Término | Significado |
|---------|-------------|
| turno | shift (apertura y cierre de caja) |
| comanda | orden de cocina (lo que va al KDS) |
| cuenta | la orden completa de una mesa (lo que se cobra) |
| arqueo | cash drawer reconciliation al cerrar turno |
| propina de ley | 10% obligatorio dominicano |
| e-CF | factura electrónica dominicana (emisión vía Alanube) |
| NCF | número de comprobante fiscal (identificador único DGII) |

## Preguntas abiertas

- [ ] Modelo/marca de impresora térmica (define si ESC/POS va en browser o servicio local)
- [ ] Credenciales Alanube/ef2 sandbox para activar e-CF real
- [ ] ¿Se implementa reservaciones en v1 o queda para v2?
- [ ] ¿Módulo de inventario entra en v1 o se mantiene fuera de scope?

## Plan de acción — 3 semanas a piloto

### Semana 4 — Operatividad FOH & Caja
- Split check endpoint + UI
- NetworkBadge en TopBar (1 línea)
- UI Sync Queue offline (drawer de comandas pendientes)
- Propinas por mesera en arqueo
- Impresión térmica ESC/POS (cuando cliente defina modelo)

### Semana 5 — Cumplimiento fiscal
- Generación real 606 / 607 (endpoints Django + descarga)
- Validación RNC Módulo 11 (frontend + backend)
- Nota de Crédito e-CF tipo 04
- Consola de reenvíos e-CF fallidos
- Fondo fijo en cierre de caja

### Semana 6 — Infra & UX Samaná
- docker-compose.prod.yml + Daphne + Nginx SSL
- Modo Sol (high contrast para terraza)
- TTS cocina via Web Speech API
- Filtro barra en KDS para bartender
- Temporizadores de alerta en KDS (>20min = rojo parpadeante)
