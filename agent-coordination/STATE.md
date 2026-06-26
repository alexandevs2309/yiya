# Project State — D' Yiya Restaurants

**Current Phase**: M0 — Seguridad (nuevo módulo, primer paso)

## Active Tickets
- M0: Security module — roles, permisos granulares, auditoría, rate limiting, session blacklist
- Spec completo en: `.kiro/specs/security-module/requirements.md`

## Build Status
- Backend: ✅ Django server on localhost:8000, all endpoints tested
- Frontend: ✅ Build passes (1728 modules), PWA sw.js generated
- Docker: ✅ docker-compose.yml configured
- Database: ✅ SQLite migrations applied, admin user created

## Known Issues
- debug_toolbar conflict with djdt namespace
- tsconfig.node.json composite + noEmit conflict (fixed)

## Next Task
Implement M0 Security Module:
1. Expand Role choices in accounts/models.py (owner, manager, cashier, bartender)
2. Create UserPermissions model (7 granular permissions + discount_limit)
3. Create AuditLog model (immutable, 10 action types)
4. Rate limiting for PIN auth (Redis, 5 attempts → 300s lockout)
5. Session blacklist (Redis, remote invalidation)
6. WorkSchedule per user (optional, timezone-aware)
7. Frontend: PermissionGuard component + inactivity timer (600s)
8. JWT config: access 15min, refresh 8h

## Completed Modules
- M1 partial: Auth (PIN + JWT) ✅, Tables ✅, Orders ✅, Kitchen KDS ✅
- M2 MVP: Kitchen WebSocket ✅
