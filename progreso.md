Basado en la auditoría y el spec del `AGENTS.md`, esto es lo que falta organizado por fase:

---

## M0: Seguridad — ~50% completo

| Pendiente | Detalle |
|---|---|
| **Enforcement de permisos granulares** | Los permisos (`can_void_orders`, `can_manage_menu`, etc.) existen en la DB pero **ningún ViewSet los verifica**. Un cocinero puede cerrar órdenes desde la API. |
| **Signal `post_save` de User** | Cuando se crea un usuario, no se crea automáticamente su `UserPermissions`. Causa errores 500. |
| **IsOwnerReadOnly** aplicado | La clase existe pero no se usa en ningún ViewSet. Los owners pueden modificar todo. |
| **Middleware de session invalidation** | Se escribe `session_invalidated:{user_id}` en Redis pero nada lo verifica en requests. Los tokens siguen vivos hasta que expiran. |
| **Soporte turnos nocturnos** | Un horario 18:00–02:00 es rechazado por la validación. Bloqueante para un restaurante nocturno. |
| **Fix `check_schedule_expiry`** | Invalida sesiones los 7 días de la semana sin respetar `work_days`. |
| **Password validators completos** | Solo tiene `MinimumLengthValidator`. |

---

## M1: FOH (POS) — ~65% completo

| Pendiente | Detalle |
|---|---|
| **Split check** | No hay lógica para dividir la cuenta entre comensales. Ni backend ni frontend. |
| **Impresión de recibos** | No existe módulo de impresión (ESC/POS para impresoras térmicas). |
| **Descuentos con validación** | El campo `discount_limit` existe pero no hay endpoint ni UI para aplicar descuentos con validación del límite por rol. |
| **Void orders con auditoría** | No hay endpoint que use `can_void_orders` para anular órdenes con registro en AuditLog. |
| **Agregar items a orden existente** | El ViewSet no tiene endpoint para agregar items después de crear la orden. |

---

## M2: Cocina (BOH) — ~70% completo

| Pendiente | Detalle |
|---|---|
| **Alertas sonoras configurables** | El sonido está hardcodeado en JS con Web Audio API. No se puede configurar volumen, tono, ni desactivar. |
| **TTS (Text-to-Speech)** | No implementado. El spec menciona anuncio por voz de platos listos. |
| **Vista barra separada** | El `bartender` ve el mismo KDS que el cocinero. Debería filtrar solo bebidas/barra. |
| **Temporizadores visibles** | No hay timer de cuánto lleva cada plato preparándose. |
| **Mark delivered** | La mesera puede marcar "ready" pero no hay flujo para marcar "delivered" (entregado al cliente). |

---

## M3: Caja — ~40% completo

| Pendiente | Detalle |
|---|---|
| **Propinas por mesera** | No hay reporte/cálculo de propinas acumuladas por mesera en un turno. |
| **Resumen visual de cierre** | El cierre de caja solo retorna JSON. No hay UI con desglose (efectivo, tarjeta, transferencias). |
| **Impresión de arqueo** | No hay generación de ticket de cierre de caja. |
| **Historial de cajas** | No hay vista para consultar cierres anteriores. |
| **Fondo de caja fijo** | No hay manejo de "dejar X en caja para el próximo turno". |

---

## M4: e-CF — ~50% completo

| Pendiente | Detalle |
|---|---|
| **Notas de crédito (Tipo 04)** | El modelo lo soporta pero no hay endpoint para generar NC vinculada a una factura. |
| **Credenciales reales de Alanube/ef2** | Solo funciona en modo simulado. Falta integración real. |
| **Reenvío manual de e-CF fallidos** | No hay endpoint para reintentar un e-CF rechazado/fallido. |
| **Consulta de estado DGII** | No hay endpoint para verificar el estado de un e-CF en la DGII. |
| **Validación de RNC** | No se valida el dígito verificador del RNC (algoritmo módulo 11). |

---

## M5: Admin — ~20% completo

| Pendiente | Detalle |
|---|---|
| **CRUD de menú (UI)** | No hay página de admin para crear/editar categorías y platos. |
| **CRUD de mesas/zonas (UI)** | No hay página para agregar mesas o zonas. |
| **Panel de auditoría (UI)** | El backend tiene AuditLog pero no hay vista frontend para consultarlo. |
| **CRUD usuarios completo (UI)** | El backend tiene endpoints pero el frontend `SettingsPage` está incompleto. |
| **Gestión de `price_today`** | No hay UI para que el admin cambie el precio del día de mariscos. |

---

## M6: Reportes — 0%

| Pendiente | Detalle |
|---|---|
| **Dashboard con métricas** | Ventas del día, semana, mes. Platos más vendidos. Ingeniería de menú. |
| **Reporte 606 (Compras)** | Formato DGII para reportar compras. El modelo `Purchase` existe pero no hay generación del archivo. |
| **Reporte 607 (Ventas)** | Formato DGII para reportar ventas con NCF. No existe. |
| **Gráficos** | No hay visualización de datos (charts de ventas, tendencias). |
| **Exportar a Excel/PDF** | No hay exportación de reportes. |

---

## M7: Clientes — 0%

| Pendiente | Detalle |
|---|---|
| **Perfil de cliente** | No existe modelo de cliente. |
| **Programa de fidelidad** | No implementado. |
| **Reservas** | No implementado. |
| **QR menú público** | No implementado. |

---

## M8: Inventario — 0%

| Pendiente | Detalle |
|---|---|
| **Proveedores** | No hay modelo de proveedor (solo `Purchase` con datos inline). |
| **Stock de perecibles** | Fuera de scope v1 según spec, pero sin iniciar. |
| **Alertas de stock bajo** | No implementado. |

---

## M9: PWA/Infra — ~30% completo

| Pendiente | Detalle |
|---|---|
| **Service Worker** | `vite-plugin-pwa` está en `devDependencies` pero no hay configuración de SW. |
| **Sync queue robusto** | El `useOfflineSync` existe pero no hay UI de "comandas pendientes". |
| **Docker production** | No hay `docker-compose.prod.yml`. Usa `runserver` en vez de Daphne. |
| **Nginx integrado** | Config existe pero no está en Docker Compose. |
| **S3 backups** | Variables en `.env.example` pero sin implementación. |
| **CI/CD** | No hay GitHub Actions ni pipeline de deploy. |
| **Migrations auto en deploy** | No hay script de deploy automatizado. |

---

## M10: UX Pulido — ~10% completo

| Pendiente | Detalle |
|---|---|
| **Modo sol** | Fuentes mínimo 18px para tablets en ambiente tropical. No implementado. |
| **Feedback háptico** | No hay vibración en acciones táctiles. |
| **Onboarding** | No hay flujo de primera configuración. |
| **Regla 3-touch** | No se ha auditado que cada acción frecuente requiera máximo 3 toques. |
| **Indicador offline en navbar** | El hook `useOnlineStatus` existe pero no hay banner verde/naranja visible. |
| **Animaciones consistentes** | Framer Motion instalado (duplicado con `motion`) pero uso parcial. |

---

## Resumen visual

```
M0  Seguridad    ██████████░░░░░░░░░░  50%
M1  FOH/POS      █████████████░░░░░░░  65%
M2  Cocina       ██████████████░░░░░░  70%
M3  Caja         ████████░░░░░░░░░░░░  40%
M4  e-CF         ██████████░░░░░░░░░░  50%
M5  Admin        ████░░░░░░░░░░░░░░░░  20%
M6  Reportes     ░░░░░░░░░░░░░░░░░░░░   0%
M7  Clientes     ░░░░░░░░░░░░░░░░░░░░   0%
M8  Inventario   ░░░░░░░░░░░░░░░░░░░░   0%
M9  PWA/Infra    ██████░░░░░░░░░░░░░░  30%
M10 UX Pulido    ██░░░░░░░░░░░░░░░░░░  10%
```

Lo más crítico para llegar a un **MVP funcional desplegable** es completar **M0 → M1 → M3** en ese orden, porque sin seguridad real, POS completo, y caja funcional no se puede operar un restaurante.