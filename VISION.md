# D' Yiya — Sistema de Restaurante Completo

El POS que tenemos hoy es ~10% de lo que un restaurante necesita para operar al máximo nivel.

## 1. FRONT OF HOUSE (FOH) — Salón

### Floor Plan Inteligente
- Mapa visual del restaurante con mesas en posición real
- Drag & drop para unir/separar mesas (mesas grandes para grupos)
- Vista de "calor": las mesas que más tiempo llevan ocupadas se ven en rojo
- Asignación automática de mesero por zona
- Tiempo promedio de rotación por mesa

### Toma de Órdenes
- Split checks: dividir cuenta por item, por comensal, en partes iguales
- Course management: entradas, platos fuertes, postres — cada curso se envía a cocina en su momento
- Modificadores complejos: "sin cebolla", "poco cocido", "salsa aparte"
- Recetas y alérgenos visibles desde el item
- Fotos de cada plato
- Quick-add: items frecuentes marcados como favoritos

### Programa de Fidelidad
- Cliente frecuente: detecta automáticamente al cliente por nombre o teléfono
- Puntos por visita, canjeables en descuentos o platos gratis
- Historial de pedidos del cliente: "el Sr. Pérez siempre pide el chillo al carbón"

### Reservas
- Calendario de reservas integrado
- Mapa de mesas vinculado: al reservar se asigna mesa automáticamente
- Recordatorio por WhatsApp al cliente 2 horas antes
- Lista de espera con notificación cuando la mesa esté libre

### Delivery & Takeout
- Pedidos en línea integrados (web + WhatsApp)
- Integración con Uber Eats, DoorDash, PedidosYa
- Zona de delivery por código postal
- Tiempo estimado de preparación visible para el cliente
- Tracking: "en cocina → empaquetado → en camino → entregado"

## 2. BACK OF HOUSE (BOH) — Cocina

### Kitchen Display System (KDS) Avanzado
- Pantallas en cocina, barra, parrilla
- Color-coding: verde < 10min, amarillo 10-20min, rojo > 20min
- Temporizador por item que cuenta hacia arriba
- Alertas sonoras: "Orden lista para entregar", "Item en riesgo de tardar", "Nueva orden entrando"
- Voz: "Nueva orden, mesa 5" (text-to-speech)
- Prioritización automática: items más largos primero

### Recetas y Producción
- Cada plato tiene receta vinculada con ingredientes y cantidades
- Al tomar la orden, el inventario se descuenta automáticamente
- Alertas de stock bajo: "Solo quedan 3 chillos"
- Sugerencia de compra: basada en velocidad de consumo

### Estación de Barra
- Vista separada para bartenders: solo tragos
- Recetas de cocteles con medidas exactas
- Control de inventario de licores por botella

## 3. MANAGEMENT — Gerencia

### Dashboard en Tiempo Real
- Ventas hoy vs ayer vs misma semana año pasado
- Mesas ocupadas / libres / cuenta en vivo
- Item más vendido hoy, más rentable, más lento
- Velocidad de rotación promedio por mesa y por mesero
- Tiempo promedio de espera en cocina
- Alertas: "Tiempo de cocina supera 30min", "Mesa 8 lleva 2h sin pedir postre"

### Reportes (para DGII y Contabilidad)
- Reporte 606: Compras (proveedores, montos, ITBIS)
- Reporte 607: Gastos de nómina
- Reporte diario de ventas: total, ITBIS, propinas, método de pago
- Reporte semanal/mensual/anual con comparativas
- Exportación: CSV, PDF, XLS
- Integración con contabilidad (QuickBooks, Contpaq)

### Gestión de Menú
- Editor visual de menú: drag & drop de items entre categorías
- Precio del día: programable (ej: "los lunes, el pescado del día tiene descuento")
- Disponibilidad por item: agotado, solo hoy, temporada
- Múltiples menús: desayuno, almuerzo, cena, happy hour
- Carga masiva desde Excel

### Análisis de Rentabilidad
- Costo por plato (materia prima + mano de obra + overhead)
- Margen por item: cuáles son los más rentables
- Ingeniería de menú: matriz Estrella/Vaca/Vaca Flaca/Perro
- Sugerencia de precio óptimo basado en costo y demanda

## 4. ADMINISTRACIÓN

### Roles y Permisos
- Admin: todo
- Gerente: reportes, gestión de menú, usuarios
- Mesero: POS, ver su propio cierre
- Cocina: solo KDS
- Caja: solo cobros y cierre de caja
- Delivery: solo ver pedidos de delivery

### Cierre de Caja (Arqueo)
- Apertura: monto inicial en caja
- Durante el día: cada pago se registra automáticamente
- Cierre: total vendido vs total en caja
- Diferencia: si hay diferencia, forzar justificación
- Reporte de cierre: efectivo, cardnet, transferencia, propinas
- Historial de cierres anteriores

### Turnos y Nómina
- Programación de turnos semanal
- Reloj digital: check-in/check-out en el POS
- Horas trabajadas por empleado
- Propinas distribuidas por horas trabajadas o por ventas
- Reporte de nómina integrado (eventualmente)

### Compras e Inventario (606)
- Proveedores: lista + datos para 606
- Órdenes de compra: crear, enviar, recibir
- Recepción de inventario: al llegar, se registra contra la orden
- Inventario perpetuo: cada venta descuenta automáticamente
- Ajustes de inventario: merma, rotura, robo
- Alertas de reorden: "Quedan 5 kg de arroz, reordenar"
- Toma física de inventario: programa recordatorios

### Proveedores
- Catálogo de proveedores con RNC, dirección, teléfono
- Historial de precios por item
- Evaluación: tiempo de entrega, calidad, precio
- Órdenes recurrentes: "todos los lunes 50 lbs de arroz"

## 5. CLIENTES

### Perfil del Cliente
- Datos: nombre, teléfono, email, RNC
- Historial de visitas: fechas, montos, items pedidos
- Preferencias: mesa favorita, items favoritos, alérgenos
- Cumpleaños: alerta para ofrecer descuento
- Notas: "cliente exigente con la cocción", "siempre pide la misma mesa"

### Programa de Fidelidad
- Puntos por cada visita o cada peso
- Canje: descuento, plato gratis, bebida de cortesía
- Niveles: Bronce (5 visitas), Plata (15), Oro (30)
- Beneficios por nivel: descuento, prioridad en reservas, plato sorpresa

### WhatsApp
- Receipt digital después de cada pago
- Confirmación de reserva
- Recordatorio de reserva
- Promociones: plato del día, happy hour
- Encuesta de satisfacción post-visita
- Envío de e-CF (PDF + QR)

## 6. e-CF (Facturación Electrónica)

### Flujo Completo DGII Ley 32-23
- Cada factura se genera con NCF (Número de Comprobante Fiscal)
- Envío a DGII en tiempo real o batch
- Firma digital (certificado DGII)
- Cálculo automático de ITBIS 18%
- Nota de crédito para devoluciones y anulaciones

### Modalidades
- Factura de consumo (NCF: B02) — restaurantes
- Factura de consumo con RNC (B01)
- Nota de crédito (B04)
- Comprobante de pago (B14) — para propinas

### Integración Alanube/ef2
- API para envío automático
- Cola Celery con re-intentos
- Estado: enviado, recibido por DGII, rechazado, aprobado
- Notificación al cliente cuando la factura esté aprobada

## 7. OFFLINE / PWA

### Funcionamiento Desconectado
- IndexedDB: toda la data local
- Service Worker: cache de assets y API
- Las órdenes se crean localmente
- Los pagos en efectivo se registran offline
- CardNET se bloquea offline
- Cola de sincronización: cuando vuelve internet
- Conflicto: si dos dispositivos modificaron la misma orden, resolver

## 8. HARDWARE

### Periféricos
- Impresora térmica (recibos, comandas en cocina)
- Cajón de dinero (se abre automáticamente al cobrar)
- Lector de código de barras (inventario)
- Display para cliente (muestra el total mientras cobras)
- Tablets resistentes para meseros
- Pantalla en cocina (KDS)

### Configuración de Impresión
- Por categoría: "las bebidas van a la barra, los platos a cocina"
- Por estación: impresora en parrilla, impresora en barra
- Formato de comanda personalizable
- Auto-corte: papel se corta después de cada comanda

## 9. INTEGRACIONES

### Pasarelas de Pago
- CardNET (estándar RD)
- PayPal / Stripe (online)
- Transferencias bancarias
- Efectivo

### Delivery
- Uber Eats
- DoorDash / PedidosYa
- Motorista propio con tracking

### Contabilidad
- QuickBooks
- Contpaq

### Marketing
- Mailchimp (correos promocionales)
- WhatsApp Business API

### RH
- Nómina: integración con calculadora de TSS (RD)
- Reloj digital

## 10. FUNCIONES AVANZADAS

### Multi-local
- Una cuenta para cadena de restaurantes
- Datos consolidados vs por local
- Menú diferente por local
- Precios diferentes por local

### Menú Digital (QR)
- Cada mesa tiene un QR
- El cliente escanea y ve el menú en su celular
- Puede hacer su propio pedido
- Puede pedir la cuenta desde el celular
- Pago desde el celular

### Cámara en Cocina
- Foto del plato terminado (calidad)
- Entrenamiento visual para cocineros nuevos

### Inteligencia Artificial
- Predicción de ventas basada en historial + clima + día de semana
- Sugerencia de personal para el turno
- Detección de fraude en devoluciones
- Optimización de precios dinámica
- Análisis de sentimiento de reseñas
- Chatbot de WhatsApp para reservas y menú
- Recomendación de platos al cliente basada en historial

---

## Qué estamos construyendo hoy

Este POS es la base. Hoy estamos perfeccionando el FOH (front of house) con el mejor UX posible.

Las capas que siguen, en orden de prioridad:

1. **F1: Fundación** ← Auth, roles, menú CRUD ← **hoy**
2. **F2: Mesas y órdenes** ← **completado MVP** 🟢
3. **F3: Cocina (KDS)** ← **completado MVP** 🟢
4. **F4: Cobro y caja** ← arqueo, cierre de turno
5. **F5: e-CF** ← Alanube, NCF, DGII
6. **F6: WhatsApp** ← Receipts, reservas, promociones
7. **F7: Reportes** ← 606/607, exportación, analytics
8. **F8: PWA Offline** ← IndexedDB, sync queue
9. **F9: UI pulido** ← Sonidos, modo sol, onboarding
10. **F10: Inventarios** ← Proveedores, compras, stock
11. **F11: Delivery & Takeout** ← Integración apps
12. **F12: Fidelidad** ← Puntos, niveles, cliente frecuente
13. **F13: Reservas** ← Calendario, QR menú
14. **F14: Multi-local** ← Cadena de restaurantes
15. **F15: AI** ← Predicción, sugerencias, chatbot
