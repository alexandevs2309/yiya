# D'Yiya POS — Handoff para Claude

## Stack
- **Backend**: Django 5.2 + DRF + Channels (InMemoryChannelLayer) + SimpleJWT + django-filter + drf-spectacular + WhiteNoise
- **Frontend**: React 19 + TypeScript + Vite 8.1 + TailwindCSS v4 + shadcn/ui (Radix) + Framer Motion + Zustand + Recharts + PWA
- **Base de datos**: PostgreSQL en producción, SQLite en desarrollo
- **Worker interno** (sin Celery): management commands `run_worker` + `recovery_worker` con `select_for_update`
- **e-CF**: Alanube API para facturación electrónica DGII (Rep. Dom.)
- **Impresión**: python-escpos (Network/USB/Dummy) para tickets y comandas
- **Infra**: Docker + Gunicorn/Daphne, o Windows nativo vía NSSM

## Estado Actual — COMPLETO Y FUNCIONAL

### Backend — 4 apps:

| App | Models | Endpoints |
|---|---|---|
| **core** | User (roles/pin), Customer (RNC), AuditLog, EmployeeShift, PayrollPayment | login (JWT+PIN), health, users CRUD, customers CRUD, audit-logs, shifts, payroll + calculate |
| **pos** | MenuCategory, MenuItem (price_today), ModifierGroup/Option, Table (UUID token), Order, OrderItem, OrderItemModifier | menu-categories, menu-items, tables (open/close/request_bill), orders (add_item, send_to_kitchen, complete_item, print), dashboard/, kiosk/ (público) |
| **billing** | NCFSequence (B01/B04/B14), Payment, ECFDocument | payments, ecf-documents (retry, update_rnc), ncf-sequences |
| **inventory** | InventoryItem, PurchaseOrder, MenuItemRecipe | items, purchase-orders, recipes |

### Frontend — 12 páginas:
login, dashboard, floor-plan, pos, kds (WebSocket + polling), cashier (split check, cambio), invoicing (e-CF console), settings (6 tabs), kiosk (público), inventory, customers, reports

### Funcionalidades clave funcionando:
- PIN login para meseros
- Pedidos con modificadores y asientos
- KDS en tiempo real por WebSocket (con fallback polling)
- Cálculo fiscal: ITBIS 18%, Propina Legal 10%
- Split check por igual o por items
- e-CF con NCF autoasignado + envío Alanube + reintentos
- Impresión ESC/POS (comandas y cuentas)
- QR Kiosk: autoservicio del comensal
- Dashboard con métricas en tiempo real + gráficos Recharts
- stock_helper descuenta inventario al pagar
- price_today para precio variable de mariscos
- Backup a S3 con rotación de 7 días
- PWA: service worker + offline manifest + standalone tablet mode

### Build: ✅ OK (841 módulos, 927 KB bundle)

## Lo que HAY QUE HACER

### 1. ARREGLAR — Issues actuales
- `staticfiles/` no existe pero está en `STATICFILES_DIRS` — warning no bloqueante
- Bundle 927 KB necesita code-splitting (`lazy()` por página)
- Sin `.env` — copiar de `.env.example`
- Probar que `python manage.py seed` funciona fresh
- Probar Alanube con modo dev (`ALANUBE_DEV_MODE=true`)

### 2. UX/UI — ESTÁ FLOJO (prioridad)
El usuario dice que se siente "flojo". Cosas que mejorar:
- **Consistencia visual**: Los componentes shadcn/ui están pero no hay un tema coherente (colores, espaciados, tipografía). Definir palette D'Yiya (azul caribeño, arena, coral).
- **Responsive**: Las pantallas POS y KDS están diseñadas para desktop/tablet pero no se probaron en resoluciones reales (1280x800, 1920x1080)
- **Transiciones**: Framer Motion está importado pero subutilizado — micro-interacciones en cards, modales, cambios de estado
- **KDS**: Temporizadores visuales (verde→ámbar→rojo) por tiempo de espera de cada orden. Sonido de llegada de orden nueva.
- **Floor Plan**: Animación de mesas que cambian de estado (transiciones suaves de color), tooltips, zoom
- **POS**: Drag de items, búsqueda con autocomplete visual, números grandes en el teclado de cantidad
- **Cashier**: Animación del cálculo de vuelto (monedas cayendo / cuenta regresiva), selector de método de pago visual (iconos grandes)
- **Modo Sol**: No está implementado. Alto contraste para uso en exteriores (playa/terraza). Fondo blanco puro, texto negro, botones con bordes gruesos.
- **Loading states**: No hay skeletons ni spinners — pantallas en blanco mientras cargan datos
- **Empty states**: No hay ilustraciones/mensajes cuando no hay datos (ej. "No hay órdenes en cocina", "No hay ventas hoy")
- **Toast/notificaciones**: Radix Toast importado pero no hay feedback visual consistente para acciones (guardar, error, éxito)
- **Mobile Kiosk**: La página de kiosco público debe ser mobile-first (es el celular del comensal). Botones grandes, swipe, carrito siempre visible abajo.
- **Tipografía**: Usar qué fuentes? Actualmente system-ui. Agregar Google Font (Poppins para títulos, Inter para cuerpo) o similar.

### 3. MEJORAS FUNCIONALES (contra especificación)
- **Impresión**: `print_service.py` existe pero no se gatilla automáticamente al enviar a cocina. Solo manual.
- **Nota de Crédito (B04)**: Modelo NCFSequence soporta B04 pero no hay UI para emitir notas de crédito desde pagos existentes
- **Apertura/cierre de turno**: EmployeeShift existe pero no hay flujo completo (arqueo de caja, cuadre, reporte de turno)
- **Órdenes canceladas**: No hay flujo de cancelación con motivo y autorización (PIN de admin)
- **Propina**: EmployeeTips o propina asignada a mesero no está implementada (Propina Legal 10% va al restaurant, no al empleado)
- **Menú del día**: `price_today` existe pero no hay UI en POS para ver/editar precio del día rápido desde el floor plan o una pantalla "Pizarra del día"
- **Historial de NCF**: No hay UI para ver secuencias usadas vs disponibles, alerta cuando quedan pocos NCF
- **Exportar datos**: Dashboard estático, no hay exportación a Excel/PDF de ventas por período
- **Múltiples impresoras**: Una para cocina (comandas), otra para caja (tickets), configuración por estación

### 4. PUESTA EN MARCHA
```bash
cd /home/alexander/Escritorio/yiya_premiun
cp .env.example backend/.env
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py seed
python manage.py runserver 0.0.0.0:8000

# En otra terminal:
cd frontend
npm run dev
```

## Consideraciones Clave
- **Local-first**: Todo funciona sin internet excepto e-CF y backup S3
- **El cliente NO ve terminal**: Solo acceso directo al navegador
- **Producción en Windows**: Servicios NSSM, Python nativo, sin Docker
- **Dockerfile existe** pero es para staging/CI, no para el cliente
- **El proyecto está en /home/alexander/Escritorio/yiya_premiun/**
- **Git**: branch main, 4 commits, todo commiteado
- **El usuario se queja de UX/UI flojo** — es la prioridad #1

## Variables de entorno requeridas (`.env`)
```
DJANGO_SECRET_KEY=
DJANGO_DEBUG=True
POSTGRES_DB=dyiya_pos
POSTGRES_USER=dyiya
POSTGRES_PASSWORD=
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
RESTAURANT_NAME=D'Yiya Restaurant
DGII_RNC=
ALANUBE_API_KEY=
ALANUBE_DEV_MODE=True
ALANUBE_COMPANY_ID=
CARDNET_TERMINAL_ID=
CARDNET_MERCHANT_ID=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
```
