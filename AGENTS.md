# D'Yiya POS — Guía para el agente

## Stack
- **Backend**: Django 5.2 + Django REST Framework + Daphne (ASGI)
- **Base de datos**: PostgreSQL 17
- **Cache/Queue**: Redis 7 + Celery
- **Frontend**: React 19 + Vite + TailwindCSS (en fases posteriores)
- **WebSockets**: Django Channels (KDS en tiempo real)
- **Autenticación**: JWT (django-rest-framework-simplejwt) + PIN para meseros
- **Contenedores**: Docker Compose con `restart: always`

## Arquitectura de despliegue (LOCAL-FIRST)

El sistema NO se despliega en un VPS remoto. Django + PostgreSQL + Redis
corren LOCALMENTE vía Docker en la computadora de caja del restaurante.

- Tablet de meseros y monitor de cocina acceden por Wi-Fi LOCAL a la IP
  de la computadora de caja (ej. 192.168.1.50:8000), nunca por internet.
- Todo el flujo operacional (mesas, comandas, cocina, cobro en efectivo)
  debe funcionar SIN internet.
- Solo dos cosas requieren internet: envío de e-CF a Alanube/DGII,
  y backup nocturno opcional a S3.
- docker-compose debe usar `restart: always` en todos los servicios
  para que sobrevivan reinicios de la computadora o cortes de luz.
- El cliente NUNCA debe ver Docker, terminal, ni comandos. Accede vía
  un acceso directo de escritorio que abre el navegador en localhost.

## Convenciones de código

### Backend (Django)
- Usar `black` para formato, `isort` para imports, `ruff` para linting
- Apps dentro de `backend/apps/`: `core` (auth, usuarios, utils), `pos` (mesas, menú, órdenes, KDS), `billing` (e-CF, pagos, NCF), `inventory` (stock, compras)
- Modelos con `UUIDField` como primary key
- Toda API view usa DRF ViewSets o APIViews con serializers
- WebSockets vía Django Channels + Redis como channel layer

### Frontend (React — fases posteriores)
- TypeScript estricto, Vite, TailwindCSS, shadcn/ui
- Estado global con Zustand (no Redux)
- PWA con Service Worker para caché offline

### Base de datos
- Migraciones de Django (no raw SQL)
- Usar `db_index` en campos de búsqueda frecuente
- Timestamps `created_at` / `updated_at` en todo modelo (campo abstracto)

## Flujo de trabajo
1. Cada feature arranca con modelos → serializers → views → URLs → tests
2. Tests primero para lógica fiscal (ITBIS, propina, validación RNC)
3. Commits convencionales: `feat:`, `fix:`, `chore:`, `docs:`

## Cálculos fiscales (República Dominicana)
- ITBIS: 18% sobre subtotal (bienes gravados)
- Propina Legal: 10% sobre subtotal
- Total = subtotal + ITBIS + Propina
- ITBIS y Propina NO se cobran sobre sí mismos (son sobre subtotal base)
- e-CF debe cumplir esquema DGII (NCF, RNC, ITBIS desglosado)

## Design System — D'Yiya Brand Identity

El proyecto tiene un Design System completo en `docs/design-system/`. Leer SIEMPRE antes de hacer cualquier cambio visual.

### Identidad: "Luxury Coastal Caribbean"
- **Azul Petróleo**: color primary (#1), evoca el océano profundo y sofisticación
- **Arena**: neutral cálido, reemplaza al gris
- **Dorado Champán**: acento de lujo (accent, warning)
- **Coral**: destructive/error
- **Verde Salvia**: success
- **Marfil**: blanco cálido para fondos light y texto en dark

### Reglas críticas (NO NEGOCIABLES)
1. **PROHIBIDO** usar colores de paleta Tailwind (text-emerald-*, bg-blue-*, etc.) o hex/rgb directos. Usar siempre variables semánticas: `text-success`, `bg-warning/10`, `border-destructive/20`, etc.
2. **PROHIBIDO** usar `<button>` raw — siempre usar el componente `<Button>` con sus variantes
3. **PROHIBIDO** padding distinto en CardContent: siempre `p-6 pt-0` (excepto tablas con `p-0`)
4. **PROHIBIDO** mezclar `bg-input` y `bg-secondary/50` — usar solo `--color-input`
5. **PROHIBIDO** sombras o radios custom — usar solo los tokens definidos
6. **PROHIBIDO** modales inline — usar siempre el componente `<Modal>`
7. **Dark mode** por clase (`<html class="dark">`), no por `@media`
8. **Iconos**: solo `lucide-react`
9. **Tipografía**: Inter (body) + Cormorant Garamond (headings) — cargadas desde Google Fonts
10. **App.css** está deprecado y debe eliminarse en la migración

### Archivos clave
- `docs/design-system/colors.md` — paleta completa + asignación temática
- `docs/design-system/typography.md` — fuentes, tamaños, pesos
- `docs/design-system/spacing.md` — escala de espaciado
- `docs/design-system/elevation.md` — niveles de sombra
- `docs/design-system/components.md` — guía de componentes
- `docs/design-system/animations.md` — duraciones y curvas
- `docs/design-system/migration-plan.md` — plan de migración faseado
- `docs/design-system/design-tokens.md` — todos los tokens CSS
