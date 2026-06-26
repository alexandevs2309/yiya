# ROADMAP — D' Yiya Sistema de Restaurante

Sistema completo de restaurante donde el POS es uno de varios módulos.
Stack: **React 19 + Zustand + React Query + Radix + Framer Motion** / **Django 5.1 + DRF + Channels + Celery**

---

## MÓDULO 0 — Seguridad (Actual)
Base de seguridad antes de construir cualquier otra cosa.

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| S.1 | Roles expandidos: `owner`, `manager`, `cashier`, `bartender` + Default_Route por rol | 0.5d | ⬜ |
| S.2 | Modelo `UserPermissions` — 7 permisos granulares por usuario | 0.5d | ⬜ |
| S.3 | `discount_limit` por usuario con defaults por rol | 0.5d | ⬜ |
| S.4 | `AuditLog` inmutable — 10 tipos de acción, transacción atómica | 1d | ⬜ |
| S.5 | Rate limiting PIN — 5 intentos → bloqueo 300s en Redis | 0.5d | ⬜ |
| S.6 | Session blacklist en Redis — invalidación remota de sesiones | 0.5d | ⬜ |
| S.7 | Work_Schedule por usuario — control de horario laboral | 0.5d | ⬜ |
| S.8 | Auto-logout por inactividad (600s) con aviso a los 60s — frontend | 0.5d | ⬜ |
| S.9 | `PermissionGuard` React — oculta controles según permisos efectivos | 0.5d | ⬜ |
| S.10 | JWT: access 15min, refresh 8h, payload mínimo (user_id+role+jti) | 0.5d | ⬜ |
| S.11 | Endpoint `GET /api/accounts/me/permissions/` | 0.5d | ⬜ |
| S.12 | Endpoint `GET /api/audit/logs/` + `GET /api/audit/summary/` | 0.5d | ⬜ |

**Entregable:** Sistema seguro desde el inicio con roles, permisos granulares y auditoría completa.

---

## MÓDULO 1 — Operación Diaria FOH (POS)
Lo que mueve el dinero. Fundación del sistema.

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 1.1 | Login PIN + roles + redirect por Default_Route | 0.5d | ✅ |
| 1.2 | Plano de mesas por zonas con estados en vivo | 0.5d | ✅ |
| 1.3 | Toma de órdenes con modificadores y notas | 0.5d | ✅ |
| 1.4 | CategoryCard + MenuItemCard + ModifiersModal | 1d | 🔄 |
| 1.5 | OrderPanel real — Cuenta/ITBIS/Propina/Total | 1d | ⬜ |
| 1.6 | CheckoutPage — efectivo/card/transfer/mixto | 1d | ⬜ |
| 1.7 | Propina sugerida 0/10/15/18% | 0.5d | ⬜ |
| 1.8 | Split check — dividir cuenta por ítem o por comensal | 1d | ⬜ |
| 1.9 | Course management — entradas → platos fuertes → postres | 1d | ⬜ |
| 1.10 | Impresión de recibo térmica ESC/POS | 1d | ⬜ |

---

## MÓDULO 2 — Back of House (Cocina)

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 2.1 | KDS con timers, alertas 15min, marcar listo | ✅ | ✅ |
| 2.2 | Vista de barra separada para `bartender` | 0.5d | ⬜ |
| 2.3 | Alertas sonoras — nueva orden, ítem listo (Web Audio API) | 0.5d | ⬜ |
| 2.4 | Text-to-speech — "Nueva orden, mesa 5" | 1d | ⬜ |
| 2.5 | Color-coding: verde <10min, amarillo 10-20min, rojo >20min | 0.5d | ⬜ |

---

## MÓDULO 3 — Caja y Arqueo

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 3.1 | Apertura de caja con monto inicial | 0.5d | ⬜ |
| 3.2 | Cierre de caja — conteo vs esperado, diferencia, notas | 1d | ⬜ |
| 3.3 | Historial de movimientos del turno | 0.5d | ⬜ |
| 3.4 | Reporte Z automático al cierre | 0.5d | ⬜ |
| 3.5 | Control de propinas por mesera al cierre del turno | 0.5d | ⬜ |
| 3.6 | Turnos del personal — quién abrió/cerró | 0.5d | ⬜ |

---

## MÓDULO 4 — Facturación Electrónica e-CF (DGII Ley 32-23)
Urgente legalmente — plazo vencido.

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 4.1 | e-CF Tipo 02 (consumidor final) vía Alanube/ef2 | 2d | ⬜ |
| 4.2 | e-CF Tipo 01 (crédito fiscal) con RNC | 1d | ⬜ |
| 4.3 | Cola Celery + reintentos exponenciales (max 5) | 0.5d | ⬜ |
| 4.4 | Nota de crédito Tipo 04 para anulaciones | 1d | ⬜ |
| 4.5 | Badge de estado e-CF en checkout (pendiente/aprobado/rechazado) | 0.5d | ⬜ |
| 4.6 | Envío PDF + QR por WhatsApp vía Twilio | 2d | ⬜ |
| 4.7 | Comprobante provisional offline impreso | 1d | ⬜ |

---

## MÓDULO 5 — Gestión del Restaurante (Admin)

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 5.1 | CRUD usuarios — crear/editar/desactivar + reset PIN | 1d | ⬜ |
| 5.2 | CRUD menú — categorías, platos, precios, imágenes | 2d | ⬜ |
| 5.3 | Precio del día — campo `price_today` variable (pescados/mariscos) | 0.5d | ⬜ |
| 5.4 | Editor drag & drop del menú | 1d | ⬜ |
| 5.5 | CRUD mesas + zonas (color, capacidad, asignar mesera) | 1d | ⬜ |
| 5.6 | Configuración general — ITBIS %, nombre, impresoras, moneda | 0.5d | ⬜ |
| 5.7 | Panel de auditoría — ver logs filtrados por acción/usuario/fecha | 1d | ⬜ |

---

## MÓDULO 6 — Inteligencia del Negocio (Dashboard + Reportes)

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 6.1 | Dashboard — ventas hoy vs ayer, mesas activas, top platos | 2d | ⬜ |
| 6.2 | Alertas en tiempo real — cocina >30min, mesa >2h sin postre | 0.5d | ⬜ |
| 6.3 | Reporte 607 (ventas) para DGII | 1d | ⬜ |
| 6.4 | Reporte 606 (compras) para DGII | 1d | ⬜ |
| 6.5 | Export CSV / Excel / PDF | 1d | ⬜ |
| 6.6 | Ingeniería de menú — matriz Estrella/Vaca/Vaca Flaca/Perro | 2d | ⬜ |
| 6.7 | Comparativa semanal/mensual con gráficas | 1d | ⬜ |

---

## MÓDULO 7 — Clientes y Fidelización

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 7.1 | Perfil de cliente — historial, preferencias, alergenos, notas | 1d | ⬜ |
| 7.2 | Programa de puntos — niveles Bronce/Plata/Oro | 2d | ⬜ |
| 7.3 | Reservas con mapa de mesas + recordatorio WhatsApp | 2d | ⬜ |
| 7.4 | Menú QR — cliente escanea y ve el menú en su celular | 1d | ⬜ |
| 7.5 | Encuesta de satisfacción post-visita por WhatsApp | 1d | ⬜ |

---

## MÓDULO 8 — Inventario y Compras

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 8.1 | Catálogo de proveedores con RNC (para 606) | 1d | ⬜ |
| 8.2 | Registro de compras — descuenta inventario al recibir | 1d | ⬜ |
| 8.3 | Stock por lote/peso — perecibles (pescados, mariscos) | 2d | ⬜ |
| 8.4 | Alertas de reorden — "quedan 3 chillos" | 0.5d | ⬜ |
| 8.5 | Orden de compra automática basada en velocidad de consumo | 2d | ⬜ |

---

## MÓDULO 9 — PWA / Offline / Infra

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 9.1 | IndexedDB schema — pending_orders, pending_payments, menu_cache | 0.5d | ⬜ |
| 9.2 | Sync queue al volver online (reintentos exponenciales, UUID) | 1d | ⬜ |
| 9.3 | Modo "promesa de pago" para tarjeta en offline | 1d | ⬜ |
| 9.4 | vite-plugin-pwa — manifest, service worker, NetworkFirst | 1d | ⬜ |
| 9.5 | Backup automático BD a S3 — retención 10 años (DGII) | 0.5d | ⬜ |
| 9.6 | Docker Compose + VPS + SSL Certbot | 1d | ⬜ |
| 9.7 | Monitoreo básico — healthcheck, logs, alertas | 0.5d | ⬜ |

---

## MÓDULO 10 — UX Crítica de Operación

| # | Tarea | Esfuerzo | Estado |
|---|-------|----------|--------|
| 10.1 | Modo Sol — toggle alto contraste para tablets en terraza | 1d | ⬜ |
| 10.2 | Feedback háptico — botones críticos: +, Pagar, Marcar listo | 0.5d | ⬜ |
| 10.3 | Swipe-to-delete en OrderItemRow (touch) | 0.5d | ⬜ |
| 10.4 | Onboarding guiado — primer uso del sistema por rol | 1d | ⬜ |
| 10.5 | Alerta "mesa fría" — >30min sin actividad | 0.5d | ⬜ |
| 10.6 | Auditoría de anulaciones con justificación obligatoria | ✅ (en S.4) | ✅ |
| 10.7 | Framer Motion — animaciones polish, sonidos, empty states | 1d | ⬜ |

---

## Prioridad de Ejecución

| Orden | Módulo | Por qué |
|-------|--------|---------|
| 1 | Módulo 0 — Seguridad | Primero siempre la seguridad |
| 2 | Módulo 1 — FOH (POS) | Genera el dinero del restaurante |
| 3 | Módulo 2 — Cocina | Coordinación FOH↔BOH |
| 4 | Módulo 3 — Caja | Control financiero diario |
| 5 | Módulo 4 — e-CF | Cumplimiento legal DGII (urgente) |
| 6 | Módulo 5 — Admin | Gestionar el negocio |
| 7 | Módulo 6 — Dashboard | Tomar decisiones con datos |
| 8 | Módulo 9 — PWA/Infra | Resiliencia operativa |
| 9 | Módulo 10 — UX | Pulir la experiencia |
| 10 | Módulo 7 — Clientes | Fidelización |
| 11 | Módulo 8 — Inventario | Control de stock |

---

## Notas

- **Cada módulo entrega valor usable** — no features a medio hacer.
- **Definition of Done:** build pasa, typecheck pasa, lint pasa, test manual en tablet + móvil.
- **Seguridad primero** — todo nuevo endpoint hereda los guards de permisos desde el inicio.
- **3-touch max rule** — ninguna acción frecuente debe requerir más de 3 toques.
