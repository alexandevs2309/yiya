# Estado del Proyecto — D'Yiya POS (Avances y Pendientes)

Este documento resume el estado actual del desarrollo del Punto de Venta (POS) de **D'Yiya Restaurant'S**, detallando las características completadas y las propuestas para futuras fases de desarrollo.

---

## 1. Avances y Características Completadas

### 🛡️ Resiliencia Local-First (Operación Sin Internet)
*   [x] **NetworkBadge dinámico**: Visualización del estado de conexión (Online/Offline) en el header de la aplicación.
*   [x] **Cola de IndexedDB (`dyiya-offline`)**: Encolamiento automático de escrituras (`POST`, `PUT`, `PATCH`, `DELETE`) al perder la conexión y sincronización secuencial en segundo plano al volver a estar online.
*   [x] **Gestión de UUIDs**: Autogeneración de llaves únicas en el cliente respetadas por el servidor Django para evitar registros duplicados.

### 🖨️ Impresión Térmica ESC/POS Directa
*   [x] **Servicio de Formateo y Conector Físico**: Formateador de tickets de 80mm con soporte de red (LAN), USB y Dummy de depuración (`print_service.py`).
*   [x] **Comandas de Cocina Automatizadas**: Impresión automática al enviar nuevos platos a la cocina.
*   [x] **Tickets de Caja por Pago**: Impresión de comprobantes con NCF, ITBIS desglosado, y propina legal del 10%.

### 🔊 Monitor de Cocina (KDS) Audivo (TTS)
*   [x] **Alertas de Voz (Web Speech API)**: Lectura automatizada en idioma español de nuevas comandas (ej. *"Mesa 3, prepararse: 2 Chillo Frito"*).
*   [x] **Control de Silencio**: Botón táctil en el KDS para desactivar/activar las llamadas de voz.
*   [x] **Fallback de Detección**: Sistema híbrido (WebSockets + Polling cada 10 segundos) para asegurar la recepción de comandas en cocina.

### 📑 Notas de Crédito Electrónicas (B04)
*   [x] **Soporte Fiscal de Anulaciones**: Integración de NCF Tipo 04 con referencia automática al `ncf_modificado` original en la API de Alanube.
*   [x] **Cierre y Reajuste**: Cancelación física de la orden (`cancelled`) y registro de auditoría fiscal en el backend.

### ☀️ Precios del Día y Modo Sol
*   [x] **Precios de Mariscos**: Configuración y edición directa de `price_today` en el catálogo para priorizar cobros dinámicos de langostas y pesca fresca.
*   [x] **Modo Sol (Alto Contraste)**: Botón táctil de anteojos de sol (`Glasses`) que elimina sombras, engrosa los trazos y aplica contraste extremo HSL para alta visibilidad en exteriores.

### 🥞 División de Cuentas (Split Bill)
*   [x] **Abonos y Cobros Parciales**: Base de datos adaptada para soportar múltiples pagos y emitir NCFs individuales por cada pago parcial.
*   [x] **Interfaz de División Táctil**: División de cuenta en partes iguales o seleccionando platos y cantidades específicas.

### 👥 Gestión Integral de Empleados
*   [x] **Reloj Checador de Asistencia**: Fichaje de turnos (`EmployeeShift`) por PIN.
*   [x] **Nómina y Comisiones**: Salario base por horas y comisiones del mesero.
*   [x] **Reparto de Propinas Proporcional**: Reparto automático del pozo de propinas acumulado según las horas registradas por cada empleado.
*   [x] **Consumo y Deducción**: Descuento del 50% en comida de personal con cargo directo a la deducción de su nómina.
*   [x] **PIN de Autorización**: Bloqueo modal (`PinAuthModal`) para proteger cancelaciones, descuentos y cortesías.

---

## 2. Tareas Pendientes y Próximas Características (Roadmap)

Para continuar llevando el POS de D'Yiya a un estándar aún más alto, se proponen las siguientes características en fases subsecuentes:

### 🗺️ Fase A: Plano de Mesas Interactivo (Visual Drag & Drop)
*   [ ] **Editor de Salón**: Permitir al administrador dibujar y ordenar visualmente las mesas (redondas, cuadradas, barras).
*   [ ] **Estado de Ocupación por Colores**: Colorear las mesas según el tiempo que lleven abiertas (ej. Rojo: comiendo, Dorado: solicitó cuenta, Gris: disponible).
*   [ ] **Reserva de Mesas**: Agregar calendario básico de reservaciones por mesa.

### 📱 Fase B: Auto-Pedido en Mesa (Kiosko Móvil QR)
*   [ ] **Menú Digital Autónomo**: Interfaz de cliente móvil (`/kiosk`) optimizada para teléfonos inteligentes al escanear el QR físico de la mesa.
*   [ ] **Pedidos al KDS**: Permitir al cliente agregar productos y enviarlos a cocina directamente (resguardado por autorización o directo).
*   [ ] **Consulta de Cuenta**: Mostrar el estado y balance actual de la mesa en tiempo real en la pantalla del cliente.

### 📊 Fase C: Analítica Avanzada e Informes Gerenciales
*   [ ] **Cierre de Caja Diario (Reporte X y Z)**: Generación automática del arqueo de caja con desglose de métodos de pago (Efectivo, CardNET, tPago), propinas y deducciones.
*   [ ] **Productos más Vendidos (Gráficas)**: Panel visual con los platos de mayor rotación y márgenes de ganancia.
*   [ ] **Reporte Fiscal DGII (607/608)**: Exportación directa en formato CSV compatible con los esquemas de reporte mensual de la DGII.

### 🔌 Fase D: Integración de Pasarelas de Pago Directas
*   [ ] **Integración CardNET**: Conexión con terminales físicos (Pinpads) por red local para procesar cobros con tarjeta sin digitar el monto manualmente en el datafono.
*   [ ] **Notificaciones tPago**: API listener para confirmar transferencias instantáneas automáticas en caja.
