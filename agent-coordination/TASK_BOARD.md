# Task Board

## In Progress
- M0.S1: Expand roles (owner, manager, cashier, bartender) + Default_Route per role

## Backlog — M0: Seguridad
- M0.S2: UserPermissions model (7 granular permissions + discount_limit)
- M0.S3: AuditLog model (immutable, 10 action types, atomic transactions)
- M0.S4: Rate limiting PIN — Redis, 5 attempts → 300s lockout + manual unblock
- M0.S5: Session blacklist — Redis, remote session invalidation endpoint
- M0.S6: WorkSchedule per user (optional, America/Santo_Domingo timezone)
- M0.S7: PermissionGuard React component (hide controls, not just disable)
- M0.S8: Inactivity timer (600s, 60s warning, audit log on logout)
- M0.S9: JWT config: access 15min, refresh 8h, minimal payload
- M0.S10: GET /api/accounts/me/permissions/ endpoint
- M0.S11: GET /api/audit/logs/ + GET /api/audit/summary/ endpoints
- M0.S12: DRF permissions: HasGranularPermission(permission_name)

## Backlog — M1: FOH (POS)
- M1: CategoryCard + MenuItemCard + ModifiersModal (in progress)
- M1: OrderPanel real (subtotal, ITBIS 18%, propina, total)
- M1: CheckoutPage (cash/card/transfer/mixed + propina sugerida)
- M1: Split check (por ítem o por comensal)
- M1: Course management (entradas → platos → postres)
- M1: Thermal receipt printing (ESC/POS)

## Backlog — M2: BOH
- M2: Bartender view (drinks only filter in kitchen)
- M2: Kitchen sound alerts (Web Audio API)
- M2: Color-coding: verde/amarillo/rojo por tiempo

## Backlog — M3: Caja
- M3: Open/close cashier with initial amount
- M3: Shift close with count vs expected, difference, notes
- M3: Tips per waitress report at shift close

## Backlog — M4: e-CF
- M4: e-CF Tipo 02 via Alanube/ef2 + Celery queue
- M4: e-CF Tipo 01 (RNC) + Tipo 04 (void note)
- M4: WhatsApp PDF+QR via Twilio
- M4: Offline provisional receipt + sync queue

## Backlog — Subsequent Modules
- M5: Admin CRUD (users, menu, tables, settings, audit panel)
- M6: Dashboard + 606/607 reports + menu engineering
- M7: Clients, loyalty program, reservations, QR menu
- M8: Inventory (providers, purchases, stock, perishables)
- M9: PWA offline (IndexedDB, sync, S3 backup, Docker VPS)
- M10: UX polish (modo sol, haptic, onboarding, animations)

## Blocked
- (none)
