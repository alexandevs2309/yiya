# CONTEXTO — D' Yiya Restaurants

## Stack
- Django + DRF + Channels + React (Vite) + PWA + PostgreSQL
- Tiempo real: Django Channels + Redis (WebSocket cocina)
- Tareas async: Celery + Redis (cola e-CF, sync offline, reportes)
- Deploy: Docker Compose + VPS + Nginx (mismo patrón Auron Suite)
- Impresión: python-escpos (térmica ESC/POS)

## Cliente
- Restaurante comidas típicas, Samaná, RD
- 10 mesas, 5 usuarios: 2 admins, 2 meseras, 1 cocinero, 1 utility/sin acceso
- Hoy operan en papel. Obligados a e-CF por Ley 32-23 (plazo vencido mayo 2026)

## e-CF (DGII)
- Via Alanube o ef2 (BaaS) — POST JSON → BaaS firma XML → DGII → e-NCF
- Tipos: 01 crédito fiscal, 02 consumidor final, 04 nota de crédito
- Sin internet: comprobante provisional impreso, e-CF real se emite cuando hay conexión y se envía por WhatsApp
- No es legalmente válido emitir e-CF offline — la cola Celery es un riesgo si fiscalizan
- Formulario 607 generado automáticamente desde ventas + compras del mes
- Resguardo 10 años: backups diarios + backups offsite cifrados + plan de restauración

## Pagos
- CardNET/Azul + efectivo + transferencia (Stripe no opera en RD)
- Offline total: solo efectivo. Tarjeta requiere internet para procesar
- Pago mixto (combinación de métodos)
- Modo "promesa de pago" para tarjeta en offline que sincroniza después

## Offline
- Crítico. PWA + Service Worker + IndexedDB para meseras
- Pantalla de cocina funciona en LAN local (React necesita servidor — mismo Docker en LAN o PWA local)
- e-CF: queda en cola con estado "pendiente", Celery + Celery Beat procesa al recuperar conexión
- Riesgo: si una tablet se daña o roban, datos del día perdidos (solo están en IndexedDB)
- Posible mejora: sync periódico a nodo local secundario o exportación automática

## Multitenant
- Arquitectura preparada desde el inicio con tenant_id en todas las tablas
- Pero NO activar hasta el segundo restaurante — añade complejidad innecesaria al MVP
- Empezar single-tenant con schema ready para migrar

## Twilio
- Ya integrado en Auron Suite — reutilizar
- Envío de e-CF en PDF + QR por WhatsApp al cliente

## Inventario
- NO contemplado en el plan original — necesario para perecibles (pescados, mariscos)
- Control de stock por lote o peso
- Merma real solo se calcula con inventario, no con ventas

## Facturación de compras
- Para declarar ITBIS correctamente (607) necesitas registrar compras con crédito fiscal
- El sistema actual solo contempla ventas — incompleto para contabilidad

## UI/UX
- Meseras y cocinero probablemente no técnicos — UI must be ultra simple
- Probar con ellos antes de pulido final (Fase 8)
- Optimizado para tablet 10" (meseras) y pantalla grande (cocina)

## Observaciones al plan original
- Costos e-CF: validar si Alanube/ef2 tienen tarifa plana o tope mensual (~RD$900-2400/mes para 300 transacciones)
- No hay backup físico/local de BD — solo VPS. Para 10 años DGII se necesita offsite
- Onboarding del personal no está considerado en las fases
- Division de cuenta y propina sugerida son diferenciadores reales en RD
