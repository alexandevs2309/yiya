# Requirements Document

## Introduction

El módulo de seguridad de D' Yiya Restaurants amplía la base de autenticación existente
(JWT + PIN SHA-256 + `RoleGuard`) para cubrir las necesidades operativas de un restaurante
con múltiples turnos, tablets compartidas y obligaciones fiscales bajo la Ley 32-23 de la
DGII. El módulo introduce roles adicionales, permisos granulares por usuario, auditoría
inmutable de acciones sensibles, auto-logout por inactividad, protección contra fuerza bruta
en el PIN, control de horario laboral e invalidación remota de sesiones.

## Glossary

- **Security_Module**: El subsistema implementado en `apps/accounts/` que gestiona roles,
  permisos, auditoría y control de sesión.
- **Auth_Service**: Componente backend (Django/DRF) que procesa autenticación y autorización.
- **Auth_Store**: Store Zustand del frontend (`auth.store.ts`) que persiste tokens cifrados en
  `localStorage`.
- **Role_Guard**: Componente React (`RoleGuard.tsx`) que redirige usuarios sin el rol requerido.
- **Permission_Guard**: Componente React que verifica permisos granulares individuales además del rol.
- **Audit_Log**: Registro inmutable de acciones sensibles en base de datos.
- **PIN**: Código numérico de 4–6 dígitos usado para autenticación rápida en tablet.
- **JWT**: Par de tokens (access + refresh) emitidos por `simplejwt` tras autenticación exitosa.
- **Inactivity_Timer**: Contador de inactividad frontend que dispara el auto-logout.
- **Work_Schedule**: Ventana horaria configurable por usuario que delimita el acceso permitido.
- **Session_Blacklist**: Almacén en Redis que registra tokens invalidados antes de su expiración.
- **Rate_Limiter**: Mecanismo que bloquea un usuario tras N intentos fallidos de PIN.
- **Default_Route**: Ruta de aterrizaje asignada a cada rol tras un login exitoso.
- **Owner**: Rol propietario del restaurante — acceso total de lectura, sin operación directa del POS.
- **Manager**: Rol gerente — operación amplia del POS con límites de descuento y reportes.
- **Cashier**: Rol cajero — acceso al checkout y apertura/cierre de caja.
- **Bartender**: Rol bartender — vista de cocina/barra, toma de órdenes de bebidas.
- **Admin**: Rol administrador técnico — gestión de usuarios, menú y configuración del sistema.
- **Waitress**: Rol mesera — toma de órdenes en sala.
- **Cook**: Rol cocinero — pantalla de cocina, sin acceso al POS.
- **Utility**: Rol sin acceso operativo al sistema.
- **Granular_Permission**: Permiso individual que puede activarse o desactivarse por usuario
  independientemente de su rol.
- **Discount_Limit**: Porcentaje máximo de descuento que un usuario puede aplicar, configurable
  por usuario.

---

## Requirements

### Requirement 1: Roles Expandidos del Sistema

**User Story:** Como propietario de D' Yiya, quiero que el sistema reconozca los roles
`owner`, `manager`, `cashier` y `bartender` además de los existentes, para que cada empleado
tenga acceso únicamente a las funciones de su puesto.

#### Acceptance Criteria

1. THE Security_Module SHALL soportar exactamente ocho roles: `owner`, `manager`, `cashier`,
   `bartender`, `admin`, `waitress`, `cook` y `utility`. Cualquier otro valor de rol SHALL ser
   rechazado por el sistema.

2. WHEN un usuario completa un login exitoso, THE Auth_Service SHALL incluir en la respuesta
   el campo `default_route` con el valor correspondiente a su rol según la siguiente tabla:
   - `owner` → `/dashboard`
   - `manager` → `/dashboard`
   - `cashier` → `/checkout`
   - `waitress` → `/tables`
   - `cook` → `/kitchen`
   - `bartender` → `/kitchen`
   - `admin` → `/admin`
   - `utility` → `/access-denied`

3. WHEN un usuario autenticado intenta navegar a una ruta no autorizada para su rol,
   THE Role_Guard SHALL redirigir al usuario a su `default_route` sin mostrar contenido
   de la ruta solicitada.

4. WHEN se intenta asignar a un usuario un valor de rol no incluido en la lista de ocho
   roles válidos, THE Auth_Service SHALL retornar HTTP 400 con un mensaje que especifique
   los valores de rol aceptados.

5. THE Security_Module SHALL mantener los datos de usuarios existentes con roles `admin`,
   `waitress`, `cook` y `utility` sin modificación, y dichos usuarios SHALL poder
   autenticarse sin acción adicional tras el despliegue del módulo.

---

### Requirement 2: Permisos Granulares por Usuario

**User Story:** Como administrador, quiero configurar permisos individuales por usuario más allá
de su rol base, para que operaciones sensibles como anular órdenes o aplicar descuentos sean
controladas con precisión.

#### Acceptance Criteria

1. THE Security_Module SHALL soportar exactamente siete Granular_Permissions configurables
   por usuario: `can_void_orders`, `can_apply_discount`, `can_view_reports`,
   `can_manage_menu`, `can_open_cashier`, `can_manage_users` y `can_view_all_orders`.

2. WHEN se crea un nuevo usuario, THE Security_Module SHALL asignar automáticamente los
   permisos por defecto según su rol:

   | Permiso               | owner | manager | cashier | bartender | admin | waitress | cook | utility |
   |---|---|---|---|---|---|---|---|---|
   | can_void_orders       | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
   | can_apply_discount    | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
   | can_view_reports      | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
   | can_manage_menu       | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
   | can_open_cashier      | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
   | can_manage_users      | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
   | can_view_all_orders   | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |

3. WHEN un usuario con `can_manage_users` actualiza los permisos de un segundo usuario,
   THE Auth_Service SHALL persistir únicamente los campos modificados, dejando los demás
   permisos del usuario objetivo sin cambio.

4. WHEN un usuario sin el Granular_Permission requerido intenta ejecutar una acción
   protegida, THE Auth_Service SHALL retornar HTTP 403 con un cuerpo JSON que incluya el
   campo `required_permission` con el nombre exacto del permiso faltante.

5. THE Security_Module SHALL exponer `GET /api/accounts/me/permissions/` que retorne un
   objeto JSON con los siete permisos como claves booleanas; el endpoint SHALL estar
   accesible para cualquier usuario autenticado.

6. WHEN el Permission_Guard recibe el objeto de permisos del Auth_Store, THE Permission_Guard
   SHALL ocultar (no renderizar) los controles sensibles cuyos permisos correspondientes
   sean `false`, en lugar de mostrarlos deshabilitados.

---

### Requirement 3: Límite de Descuento por Usuario

**User Story:** Como gerente, quiero que cada usuario tenga un porcentaje máximo de descuento
configurable, para que las meseras no puedan aplicar descuentos superiores al límite autorizado.

#### Acceptance Criteria

1. THE Security_Module SHALL almacenar un campo `discount_limit` por usuario expresado como
   número entero en el rango [0, 100], representando el porcentaje máximo de descuento
   permitido.

2. WHEN se crea un nuevo usuario, THE Security_Module SHALL asignar automáticamente el
   `discount_limit` por defecto según su rol:
   - `owner` → 100
   - `admin` → 100
   - `manager` → 20
   - `cashier` → 10
   - `waitress` → 5
   - `bartender`, `cook`, `utility` → 0

3. IF un usuario con `can_apply_discount` intenta aplicar un descuento cuyo porcentaje supera
   su `discount_limit`, THEN THE Auth_Service SHALL retornar HTTP 400 con un mensaje que
   indique el límite máximo permitido para ese usuario.

4. WHEN un usuario con `can_manage_users` actualiza el `discount_limit` de otro usuario con
   un valor entero en el rango [0, 100], THE Auth_Service SHALL persistir el nuevo valor y
   retornar HTTP 200.

5. IF un usuario con `can_manage_users` envía un valor de `discount_limit` fuera del rango
   [0, 100] o que no sea un entero, THEN THE Auth_Service SHALL retornar HTTP 400 con un
   mensaje descriptivo indicando el rango aceptado.

---

### Requirement 4: Auditoría Inmutable de Acciones Sensibles

**User Story:** Como propietario, quiero un registro inmutable de todas las acciones sensibles
realizadas en el sistema, para poder auditar anulaciones, descuentos y cambios de configuración
ante cualquier discrepancia o requerimiento fiscal.

#### Acceptance Criteria

1. THE Audit_Log SHALL registrar una entrada por cada ocurrencia de las siguientes diez
   acciones: `void_order`, `apply_discount`, `login`, `logout`, `failed_pin`, `manage_user`,
   `open_cashier`, `close_cashier`, `change_price`, `delete_menu_item`.

2. THE Audit_Log SHALL incluir en cada entrada los campos: `id` (UUID), `action`, `actor_id`
   (UUID), `actor_username`, `target_id` (UUID, nullable), `target_type`, `detail` (JSON),
   `ip_address` y `timestamp` (UTC, precisión de milisegundos).

3. IF cualquier operación intenta modificar o eliminar una entrada del Audit_Log mediante
   cualquier método (API, ORM, SQL directo), THEN THE Audit_Log SHALL rechazar la operación
   retornando un error que indique que las entradas son de solo lectura.

4. IF una solicitud `void_order` no incluye el campo `reason` o el valor de `reason` tiene
   menos de 10 caracteres, THEN THE Auth_Service SHALL retornar HTTP 400 sin ejecutar la
   anulación y sin crear entrada en el Audit_Log.

5. THE Auth_Service SHALL escribir la entrada en el Audit_Log dentro de la misma transacción
   de base de datos que la acción principal, de modo que si la escritura en el Audit_Log
   falla, la acción principal sea revertida también.

6. WHEN un usuario con `can_view_reports` realiza una solicitud `GET /api/audit/logs/`,
   THE Auth_Service SHALL retornar una lista paginada de 50 entradas por página, con soporte
   de filtros por `action`, `actor_id`, `date_from` y `date_to` en formato ISO 8601.

7. IF la escritura en el Audit_Log falla por error de base de datos, THEN THE Auth_Service
   SHALL revertir también la acción principal y retornar HTTP 500 al cliente.

---

### Requirement 5: Auto-Logout por Inactividad

**User Story:** Como administrador, quiero que las tablets cierren sesión automáticamente tras
10 minutos de inactividad, para que un turno que termina no deje la sesión abierta para el
siguiente empleado.

#### Acceptance Criteria

1. WHEN un usuario autenticado genera un evento de interacción (click, toque de pantalla,
   pulsación de tecla o scroll), THE Inactivity_Timer SHALL reiniciarse a 600 segundos.

2. WHEN el Inactivity_Timer llega a cero, THE Auth_Store SHALL eliminar los tokens del
   almacenamiento cifrado, limpiar el estado de usuario en Zustand y redirigir al usuario
   a `/login`.

3. WHEN el Inactivity_Timer cae por debajo de 60 segundos, THE Auth_Store SHALL mostrar un
   aviso que ocupe al menos 200×80 px en pantalla, con un contador visible que muestre los
   segundos restantes.

4. WHILE el aviso está visible, WHEN el usuario genera cualquier evento de interacción,
   THE Inactivity_Timer SHALL reiniciarse a 600 segundos y el aviso SHALL ocultarse.

5. WHEN el Inactivity_Timer llega a cero, THE Auth_Store SHALL enviar la entrada de
   Audit_Log con acción `logout` antes de redirigir al usuario a `/login`.

6. WHILE el usuario tiene sesión activa, THE Inactivity_Timer SHALL ejecutarse con un
   intervalo de actualización de 1 segundo sin provocar caídas de la tasa de renderizado
   por debajo de 60 fps.

7. THE Inactivity_Timer SHALL activarse únicamente cuando existe un usuario autenticado en
   el Auth_Store, y SHALL detenerse al ejecutarse el logout (manual o automático).

---

### Requirement 6: Rate Limiting en Autenticación por PIN

**User Story:** Como administrador, quiero que el sistema bloquee temporalmente a un usuario
tras 5 intentos fallidos de PIN, para proteger las tablets compartidas contra acceso no
autorizado por fuerza bruta.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL contabilizar por usuario los intentos fallidos de PIN dentro de
   una ventana deslizante de 5 minutos, usando un mecanismo persistente externo al proceso
   de la aplicación.

2. WHEN un usuario acumula 5 intentos fallidos de PIN dentro de la ventana de 5 minutos,
   THE Auth_Service SHALL bloquear la autenticación por PIN de ese usuario durante 300
   segundos e incluir en la respuesta el tiempo restante de bloqueo en segundos.

3. WHILE un usuario se encuentra en estado bloqueado, THE Auth_Service SHALL rechazar
   cualquier intento de autenticación por PIN de ese usuario con el código de respuesta
   apropiado para demasiadas solicitudes, sin validar el valor del PIN recibido.

4. WHEN el período de bloqueo de 300 segundos expira, THE Rate_Limiter SHALL restablecer el
   contador de intentos fallidos del usuario a cero sin intervención manual.

5. THE Auth_Service SHALL crear una entrada en el Audit_Log por cada intento fallido de PIN,
   incluyendo la dirección IP de origen; las entradas generadas durante el período de bloqueo
   también SHALL ser registradas.

6. WHEN un usuario con `can_manage_users` solicita desbloquear a un usuario bloqueado,
   THE Auth_Service SHALL restablecer el contador y cancelar el bloqueo activo en un plazo
   máximo de 2 segundos, y SHALL registrar una entrada en el Audit_Log indicando el
   desbloqueador y el usuario desbloqueado.

7. WHEN un usuario autenticado exitosamente por PIN, THE Rate_Limiter SHALL restablecer el
   contador de intentos fallidos de ese usuario a cero.

8. WHEN un usuario con `can_manage_users` solicita desbloquear a un usuario que no está
   bloqueado, THE Auth_Service SHALL retornar HTTP 400 indicando que el usuario no está en
   estado bloqueado.

---

### Requirement 7: Control de Horario Laboral por Usuario

**User Story:** Como gerente, quiero poder configurar un horario laboral por usuario para que
el sistema deniegue el acceso fuera del turno asignado, reduciendo el riesgo de accesos no
autorizados fuera del horario del restaurante.

#### Acceptance Criteria

1. THE Security_Module SHALL almacenar por usuario un Work_Schedule opcional compuesto por:
   - `work_days`: lista de entre 1 y 7 valores distintos del rango 0–6 (0=lunes, 6=domingo)
   - `work_start`: hora de inicio en formato HH:MM
   - `work_end`: hora de fin en formato HH:MM
   Todos los campos se evalúan en la zona horaria `America/Santo_Domingo`.

2. WHERE un usuario tiene un Work_Schedule configurado, WHEN el usuario intenta autenticarse
   en un día no incluido en `work_days` o en un horario fuera del rango [`work_start`,
   `work_end`], THE Auth_Service SHALL rechazar la autenticación con HTTP 403 y un mensaje
   que indique el horario permitido.

3. WHERE un usuario tiene un Work_Schedule configurado, WHILE una sesión activa se extiende
   más allá de `work_end`, THE Auth_Service SHALL permitir las solicitudes en curso durante
   un período de gracia de 60 segundos tras `work_end`; al vencer dicho período, THE
   Auth_Service SHALL invalidar los tokens del usuario y registrar en el Audit_Log la acción
   `logout` con motivo `schedule_end`.

4. WHERE un usuario no tiene Work_Schedule configurado, THE Auth_Service SHALL aplicar
   únicamente las restricciones de rol y permisos granulares, sin ninguna restricción horaria.

5. WHEN un usuario con `can_manage_users` actualiza el Work_Schedule de un segundo usuario,
   THE Auth_Service SHALL validar que la diferencia entre `work_start` y `work_end` sea de
   al menos 1 minuto y que `work_start` sea anterior a `work_end`; si la validación falla,
   THE Auth_Service SHALL retornar HTTP 400. Si la solicitud elimina el Work_Schedule, THE
   Auth_Service SHALL retornar HTTP 200 y el usuario quedará sin restricción horaria.

6. IF un usuario con `can_manage_users` intenta actualizar su propio Work_Schedule, THEN
   THE Auth_Service SHALL retornar HTTP 403.

---

### Requirement 8: Invalidación Remota de Sesiones

**User Story:** Como administrador, quiero poder invalidar la sesión activa de cualquier
usuario desde el panel de administración, para forzar el cierre de sesión en caso de tablet
extraviada, cambio de contraseña o baja de empleado.

#### Acceptance Criteria

1. THE Auth_Service SHALL mantener una Session_Blacklist que registre tokens invalidados
   antes de su expiración natural, usando un almacén externo con soporte de expiración
   automática por TTL.

2. WHEN un usuario con `can_manage_users` invoca `POST /api/accounts/{user_id}/invalidate-session/`
   con un `user_id` existente, THE Auth_Service SHALL agregar los tokens activos del usuario
   objetivo a la Session_Blacklist y retornar HTTP 200.

3. WHEN un token presente en la Session_Blacklist se presenta en cualquier endpoint
   autenticado, THE Auth_Service SHALL retornar HTTP 401 sin procesar la solicitud.

4. THE Auth_Service SHALL crear una entrada en el Audit_Log al ejecutar una invalidación
   remota, incluyendo en el campo `detail` el motivo proporcionado por el actor y el
   `user_id` del usuario invalidado.

5. WHEN el Auth_Store recibe HTTP 401 en el interceptor de Axios, THE Auth_Store SHALL
   eliminar los tokens del almacenamiento cifrado, limpiar el estado de usuario en Zustand
   y redirigir al usuario a `/login`.

6. THE Auth_Service SHALL asignar a cada entrada de la Session_Blacklist un TTL igual al
   tiempo de vida restante del token invalidado, eliminándola automáticamente al expirar.

7. IF el `user_id` en `POST /api/accounts/{user_id}/invalidate-session/` no corresponde a
   ningún usuario existente, THEN THE Auth_Service SHALL retornar HTTP 404.

8. IF un usuario sin `can_manage_users` invoca `POST /api/accounts/{user_id}/invalidate-session/`,
   THEN THE Auth_Service SHALL retornar HTTP 403 sin agregar tokens a la Session_Blacklist.

---

### Requirement 9: Permisos de Acceso del Rol Owner

**User Story:** Como propietario del restaurante, quiero tener visibilidad total del negocio
desde el dashboard sin operar directamente el POS, para supervisar sin interrumpir el flujo
de trabajo del equipo.

#### Acceptance Criteria

1. WHEN un usuario con rol `owner` solicita acceso a `/dashboard`, `/dashboard/*` o a
   cualquier endpoint `GET /api/reports/*`, THE Role_Guard y THE Auth_Service SHALL
   permitir el acceso sin restricción adicional.

2. WHEN un usuario con rol `owner` intenta navegar a `/pos`, `/checkout`, `/tables`,
   `/kitchen` o `/admin`, THE Role_Guard SHALL redirigir al usuario a `/dashboard`.

3. WHEN un usuario con rol `owner` realiza una solicitud con método `POST`, `PUT`, `PATCH`
   o `DELETE` en cualquier endpoint de la API, THE Auth_Service SHALL retornar HTTP 403,
   a excepción de los endpoints `POST /api/accounts/me/change-pin/` y
   `POST /api/accounts/{user_id}/invalidate-session/`.

4. IF el rol `owner` ejecuta una solicitud de escritura que cae fuera de las excepciones
   del criterio 3, THEN THE Auth_Service SHALL crear una entrada en el Audit_Log con
   acción `manage_user`, campo `detail.status` igual a `denied` y el endpoint solicitado.

---

### Requirement 10: Seguridad de Tokens JWT

**User Story:** Como administrador técnico, quiero que la configuración de JWT sea segura y
coherente con las necesidades del entorno de tablets compartidas, para minimizar el riesgo de
acceso con tokens robados o caducados.

#### Acceptance Criteria

1. THE Auth_Service SHALL configurar el token de acceso JWT con un tiempo de vida de 15 minutos.

2. THE Auth_Service SHALL configurar el token de refresco JWT con un tiempo de vida de 8 horas,
   alineado con la duración máxima de un turno laboral en el restaurante (~8am–10pm).

3. WHEN el Auth_Store detecta que el token de acceso ha expirado, THE Auth_Store SHALL intentar
   renovarlo automáticamente usando el token de refresco sin requerir acción del usuario.

4. IF el token de refresco ha expirado o está en la Session_Blacklist, THEN THE Auth_Store
   SHALL limpiar el almacenamiento cifrado y redirigir al usuario a `/login`.

5. THE Auth_Service SHALL incluir en el payload del token de acceso únicamente los campos
   `user_id`, `role` y `jti`, sin exponer datos personales en el token.

6. THE Auth_Store SHALL persistir los tokens exclusivamente en el almacenamiento cifrado con
   AES-256, sin escribirlos en `sessionStorage` sin cifrar ni en cookies.

---

### Requirement 11: Gestión Segura de Usuarios

**User Story:** Como administrador, quiero un CRUD completo de usuarios con controles de
seguridad, para mantener el acceso al sistema sincronizado con el estado real del personal.

#### Acceptance Criteria

1. THE Auth_Service SHALL requerir el permiso `can_manage_users` para los endpoints
   `POST`, `PUT`, `PATCH` y `DELETE` de `/api/accounts/users/`.

2. WHEN se crea un nuevo usuario, THE Auth_Service SHALL requerir un PIN inicial de 4 a 6
   dígitos numéricos y almacenarlo como hash SHA-256 con el salt del proyecto.

3. WHEN se desactiva un usuario (`is_active = false`), THE Auth_Service SHALL invalidar
   automáticamente todos sus tokens activos en la Session_Blacklist y registrar la acción
   en el Audit_Log.

4. WHEN un usuario intenta autenticarse con `is_active = false`, THE Auth_Service SHALL
   retornar HTTP 403 con un mensaje indicando que la cuenta está desactivada.

5. THE Auth_Service SHALL impedir que un usuario modifique su propio rol o sus propios
   permisos granulares, retornando HTTP 403 si lo intenta, para prevenir escalación de
   privilegios.

6. WHEN un usuario cambia su propio PIN, THE Auth_Service SHALL requerir el PIN actual como
   confirmación antes de aceptar el nuevo PIN.

---

### Requirement 12: Parser y Serialización de Permisos

**User Story:** Como desarrollador, quiero que los permisos granulares se serialicen y
deserialicen de forma consistente entre el backend y el frontend, para evitar discrepancias
de estado que deriven en accesos incorrectos.

#### Acceptance Criteria

1. THE Auth_Service SHALL serializar el conjunto de Granular_Permissions de un usuario como
   un objeto JSON donde cada clave es el nombre del permiso y cada valor es un booleano.

2. WHEN el Auth_Store recibe la respuesta de `GET /api/accounts/me/permissions/`, THE Auth_Store
   SHALL deserializar el JSON de permisos y almacenarlo en el estado de Zustand sin pérdida
   de ningún campo.

3. FOR ALL objetos de permisos válidos, serializar y luego deserializar el objeto SHALL producir
   un objeto equivalente al original (propiedad round-trip).

4. IF el endpoint `GET /api/accounts/me/permissions/` retorna un campo de permiso desconocido,
   THEN THE Auth_Store SHALL ignorarlo sin lanzar error, para mantener compatibilidad hacia
   adelante.

---

### Requirement 13: Observabilidad y Métricas de Seguridad

**User Story:** Como administrador técnico, quiero acceder a métricas básicas de eventos de
seguridad, para identificar patrones anómalos como múltiples fallos de PIN o accesos fuera
de horario.

#### Acceptance Criteria

1. THE Auth_Service SHALL exponer el endpoint `GET /api/audit/summary/` accesible para
   usuarios con `can_view_reports`, que retorne el conteo de eventos de seguridad agrupados
   por `action` para un rango de fechas especificado en los parámetros `date_from` y `date_to`.

2. WHEN el parámetro `date_from` o `date_to` no tiene un formato de fecha ISO 8601 válido,
   THE Auth_Service SHALL retornar HTTP 400 con un mensaje descriptivo del error de formato.

3. THE Auth_Service SHALL retornar el resumen en menos de 2 segundos para rangos de hasta
   31 días, usando índices de base de datos sobre los campos `action` y `timestamp` del
   Audit_Log.
