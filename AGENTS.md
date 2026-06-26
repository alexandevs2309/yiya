# D' Yiya Restaurants — Project Context

## Stack
- **Backend**: Python 3.12 / Django 5.1 / DRF 3.15 / Channels 4.1 / Celery 5.4
- **Frontend**: React 19 / TypeScript 5.7 / Vite 6 / Tailwind 3 / shadcn/ui / Framer Motion
- **DB**: PostgreSQL 16 / SQLite (dev) / Redis 7
- **Infra**: Docker / Nginx / VPS

## Architecture
- POS system for D' Yiya Restaurants (Samaná, RD)
- Single-tenant v1 with `tenant_id` reserved for future multi-restaurant
- PWA-first: offline via IndexedDB + Service Worker
- Real-time: Django Channels + Redis WebSocket (kitchen display)
- e-CF compliance: DGII Ley 32-23 via Alanube/ef2 BaaS
- Payments: CardNET + cash + transfer (no Stripe — not available in RD)

## Project Structure
```
backend/
  config/           # Django settings (base/dev/prod), ASGI, Celery
  apps/
    core/           # BaseModel, mixins
    accounts/       # User, roles, JWT auth, PIN login
    menu/           # Categories, MenuItems, price_today
    tables/         # Tables, Zones
    orders/         # Orders, OrderItems, WebSocket consumers
    billing/        # e-CF, ECFDocument
    purchases/      # Compras 606
    cashier/        # CashRegister, arqueo

frontend/
  src/
    pages/          # login, pos, kitchen, dashboard, admin, reports
    components/     # layout, ui (shadcn)
    store/          # Zustand (auth, pos)
    services/       # Axios API client + JWT interceptors
    websocket/      # WebSocket for kitchen/waitress
    hooks/          # useOnlineStatus, useKeyboard
    types/          # TypeScript interfaces
```

## Roles
| Rol | Pantalla por defecto | Autenticación |
|---|---|---|
| owner | /dashboard (solo lectura) | Email+password o PIN |
| admin | /admin (acceso total) | Email+password o PIN |
| manager | /dashboard + POS ampliado | Email+password o PIN |
| cashier | /checkout + caja | PIN 4-6 dígitos |
| waitress | /tables + POS | PIN 4-6 dígitos |
| cook | /kitchen (KDS) | PIN 4-6 dígitos |
| bartender | /kitchen (vista barra) | PIN 4-6 dígitos |
| utility | Sin acceso operativo | — |

## Permisos Granulares
| Permiso | owner | manager | cashier | bartender | admin | waitress | cook |
|---|---|---|---|---|---|---|---|
| can_void_orders | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| can_apply_discount | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| can_view_reports | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| can_manage_menu | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| can_open_cashier | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| can_manage_users | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| can_view_all_orders | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |

## Límite de Descuento por Rol (default)
owner→100% | admin→100% | manager→20% | cashier→10% | waitress→5% | resto→0%

## Design System
- **Colors**: caribe (#0EA5E9), arena (#F5E6D3), samana (#10B981), coral (#F43F5E), sol (#F97316)
- **Typography**: system-ui, sans-serif. Min 18px for tablets (modo sol)
- **Animations**: Framer Motion — fade-in, slide-in-right, pulse
- **Offline indicator**: permanent banner in navbar (green=online, orange=offline)
- **Toast**: Radix UI toast component for feedback
- **Dark mode**: not planned (all-day operation in tropical lighting)

## Key Decisions
- Single-tenant v1 with `tenant_id` reserved
- Inventory (perishables) out of v1 scope
- Local mini-PC node optional — PWA + IndexedDB for offline
- Provisional receipt printed offline, real e-CF via WhatsApp when online
- CardNET requires internet — only cash in full offline
- Menu price_today for variable seafood prices
- 3-touch max rule for any frequent action

## Phases
| Fase | Qué | Status |
|---|---|---|
| M0: Seguridad | Roles, permisos granulares, auditoría, rate limiting, session blacklist | ⬜ |
| M1: FOH (POS) | Auth, mesas, órdenes, cobro, split check, impresión | 🔄 (mesas+cocina MVP) |
| M2: Cocina (BOH) | KDS, vista barra, alertas sonoras, TTS | ✅ MVP |
| M3: Caja | Arqueo, cierre de turno, propinas por mesera | ⬜ |
| M4: e-CF | Alanube/ef2, NCF, cola Celery, WhatsApp | ⬜ |
| M5: Admin | CRUD menú/mesas/usuarios, panel auditoría | ⬜ |
| M6: Reportes | Dashboard, 606/607, ingeniería de menú | ⬜ |
| M7: Clientes | Perfil, fidelidad, reservas, QR menú | ⬜ |
| M8: Inventario | Proveedores, compras, stock perecibles | ⬜ |
| M9: PWA/Infra | IndexedDB offline, sync queue, Docker, S3 backup | ⬜ |
| M10: UX Pulido | Modo sol, háptico, onboarding, animaciones | ⬜ |

## Context sources
- `CONTEXTO.md` — Business context document
- `.opencode/rules/` — Conventions and learned lessons
- `POS_Restaurante_Samana_v3.md` — Full product spec
