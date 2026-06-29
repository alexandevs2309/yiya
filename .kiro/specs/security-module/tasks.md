# Implementation Plan — Módulo de Seguridad

## Overview

Implementación del módulo de seguridad de D' Yiya Restaurants. Extiende la base existente
(JWT + PIN + RoleGuard) con roles expandidos, permisos granulares, auditoría inmutable,
rate limiting de PIN, session blacklist en Redis, control de horario laboral y auto-logout
por inactividad.

Principio rector: extender lo que existe antes de crear algo nuevo. Cero abstracciones extra.

## Tasks

- [x] 1. Extender roles y ejecutar migración
  - [x] 1.1 Agregar OWNER, MANAGER, CASHIER, BARTENDER al `Role(TextChoices)` en `backend/apps/accounts/models.py`
    - Agregar los cuatro valores al `TextChoices` existente que ya contiene ADMIN, WAITRESS, COOK, UTILITY
    - Ejecutar `python manage.py makemigrations accounts` y `python manage.py migrate`
    - Verificar que usuarios existentes con roles `admin`, `waitress`, `cook`, `utility` se autentican sin cambios
    - _Requirements: 1.1, 1.4, 1.5_


- [x] 2. Crear modelos UserPermissions y WorkSchedule
  - [x] 2.1 Agregar `UserPermissions(BaseModel)` a `backend/apps/accounts/models.py`
    - `OneToOneField(User, related_name="permissions")`, 7 `BooleanField(default=False)`, `discount_limit = IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])`
    - Agregar señal `post_save` en `backend/apps/accounts/apps.py` que crea `UserPermissions` con defaults por rol (tabla completa en Design § UserPermissions)
    - Ejecutar `makemigrations accounts` y `migrate`
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
  - [ ]* 2.2 Write property test para defaults de permisos por rol
    - **Property 2: Defaults de permisos y descuento por rol**
    - **Validates: Requirements 2.2, 3.2**
  - [x] 2.3 Agregar `WorkSchedule(BaseModel)` a `backend/apps/accounts/models.py`
    - `OneToOneField(User, related_name="work_schedule")`, `work_days = JSONField(validators=[validate_work_days])`, `work_start = TimeField()`, `work_end = TimeField()`
    - `clean()` que valida `work_start < work_end` con diferencia ≥ 1 minuto
    - Ejecutar `makemigrations accounts` y `migrate`
    - _Requirements: 7.1, 7.5_
  - [ ]* 2.4 Write property test para coherencia del WorkSchedule
    - **Property 19: Validación de coherencia del Work_Schedule**
    - **Validates: Requirements 7.5**

- [x] 3. Crear app apps/audit/
  - [x] 3.1 Crear estructura de la app `backend/apps/audit/`
    - Archivos nuevos: `__init__.py`, `apps.py`, `models.py`, `helpers.py`, `serializers.py`, `views.py`, `urls.py`
    - `models.py`: `AuditLog` (NO hereda BaseModel) con campos `id UUID pk`, `action CharField(db_index=True)`, `actor_id UUID`, `actor_username`, `target_id UUID nullable`, `target_type`, `detail JSONField`, `ip_address GenericIPAddressField`, `timestamp auto_now_add db_index`
    - Sobrescribir `save()` para bloquear updates (raise error si `self.pk` ya existe); sobrescribir `delete()` para lanzar `PermissionError`
    - Índice compuesto `(action, timestamp)` en `Meta.indexes`
    - `helpers.py`: función `log(action, actor, *, target_id=None, target_type='', detail=None, ip_address=None)` que crea la entrada y lanza excepción si falla
    - Agregar `"apps.audit"` a `INSTALLED_APPS` en `backend/config/settings/base.py`
    - Agregar `path("audit/", include("apps.audit.urls"))` en `api_patterns` de `backend/config/urls.py`
    - Ejecutar `makemigrations audit` y `migrate`
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.7_
  - [ ]* 3.2 Write property test para inmutabilidad de AuditLog
    - **Property 8: AuditLog es inmutable**
    - **Validates: Requirements 4.3**
  - [ ]* 3.3 Write property test para atomicidad AuditLog
    - **Property 10: Atomicidad AuditLog — fallo del log revierte la acción principal**
    - **Validates: Requirements 4.5, 4.7**
  - [x] 3.4 Agregar `AuditLogListView` y `AuditSummaryView` en `backend/apps/audit/views.py`
    - `AuditLogListView`: `GET /api/v1/audit/logs/` con filtros `action`, `actor_id`, `date_from`, `date_to` (ISO 8601), paginación 50 por página, requiere `can_view_reports`
    - `AuditSummaryView`: `GET /api/v1/audit/summary/` agrupa por `action` en rango de fechas, requiere `can_view_reports`
    - Validar que `date_from`/`date_to` sean ISO 8601; retornar 400 si el formato es inválido
    - _Requirements: 4.6, 13.1, 13.2, 13.3_
  - [ ]* 3.5 Write property test para filtros y resumen de AuditLog
    - **Property 11: Filtros de AuditLog son correctos y completos**
    - **Property 30: Resumen de auditoría es matemáticamente correcto**
    - **Property 31: Parámetros de fecha inválidos producen HTTP 400**
    - **Validates: Requirements 4.6, 13.1, 13.2**

- [x] 4. Checkpoint — backend base lista
  - Asegurarse de que `makemigrations` y `migrate` se ejecutaron para `accounts` y `audit` en orden
  - Verificar que `AuditLog`, `UserPermissions` y `WorkSchedule` existen en la DB
  - Asegurarse de que todos los tests pasan hasta este punto, preguntar al usuario si hay dudas


- [x] 5. Actualizar accounts/permissions.py
  - [x] 5.1 Agregar `HasGranularPermission` e `IsOwnerReadOnly` a `backend/apps/accounts/permissions.py`
    - `HasGranularPermission`: recibe `perm_name` en `__init__`, verifica `request.user.permissions.{perm_name}`, `message` retorna `{"required_permission": perm_name}`
    - `IsOwnerReadOnly`: permite métodos SAFE a rol `owner`; en escritura permite solo las URLs que contienen `change-pin` o `invalidate-session`; resto retorna 403 y crea entrada en `AuditLog` con `action=manage_user, detail.status=denied`
    - No modificar las clases existentes (`IsAdmin`, `IsWaitress`, `IsCook`, `IsAdminOrReadOnly`)
    - _Requirements: 2.4, 9.2, 9.3, 9.4_
  - [ ]* 5.2 Write property test para HasGranularPermission
    - **Property 4: Respuesta 403 incluye el permiso faltante exacto**
    - **Property 22: Solo owner recibe 403 en métodos de escritura (excepto excepciones)**
    - **Validates: Requirements 2.4, 9.3**

- [x] 6. Actualizar accounts/serializers.py
  - [x] 6.1 Agregar `UserPermissionsSerializer` y `WorkScheduleSerializer` a `backend/apps/accounts/serializers.py`
    - `UserPermissionsSerializer`: todos los campos de `UserPermissions`, writable, solo `can_manage_users` puede modificar
    - `WorkScheduleSerializer`: `work_days`, `work_start`, `work_end` con validaciones (work_start < work_end, work_days lista de enteros [0–6])
    - Extender la respuesta de login (PinLoginView y LoginView) para incluir `permissions` (objeto con 7 booleanos + `discount_limit`) y `default_route` (calculado del `user.role`)
    - Tabla `default_route` por rol: `owner`/`manager` → `/dashboard`, `cashier` → `/checkout`, `waitress` → `/tables`, `cook`/`bartender` → `/kitchen`, `admin` → `/admin`, `utility` → `/access-denied`
    - _Requirements: 1.2, 2.5, 12.1_
  - [ ]* 6.2 Write property test para round-trip de permisos (backend)
    - **Property 3: PATCH de permisos modifica solo los campos enviados**
    - **Validates: Requirements 2.3**

- [x] 7. Actualizar accounts/views.py con rate limiting, schedule check y nuevos endpoints
  - [x] 7.1 Extender `PinLoginView` en `backend/apps/accounts/views.py`
    - Capa 1: verificar `pin_blocked:{user_id}` en Redis → si existe: `log(failed_pin)` + retornar 429 con `remaining_seconds`
    - Capa 2: si PIN inválido: `cache.incr("pin_fails:{user_id}", timeout=300)`; al llegar a 5: `cache.set("pin_blocked:{user_id}", 1, 300)`; `log(failed_pin)`; retornar 401
    - Capa 3: si PIN válido: verificar `WorkSchedule` (día y hora en `America/Santo_Domingo`); si fuera de horario: retornar 403
    - Capa 4: si todo OK: eliminar keys Redis de intentos + `log(login)` + retornar response con `permissions` y `default_route`
    - Capa 5: verificar `blacklist:{jti}` en Redis en cada request autenticado mediante mixin o clase base; si existe retornar 401
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8, 7.2, 8.3, 10.1, 11.4_
  - [ ]* 7.2 Write property test para rate limiting PIN
    - **Property 15: Contador de intentos fallidos de PIN incrementa correctamente**
    - **Property 16: PIN bloqueado rechaza cualquier intento sin validar el PIN**
    - **Property 17: PIN exitoso resetea el contador de intentos fallidos a cero**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.7**
  - [ ]* 7.3 Write property test para WorkSchedule en autenticación
    - **Property 18: Autenticación fuera del Work_Schedule es rechazada**
    - **Validates: Requirements 7.2**
  - [x] 7.4 Agregar los seis nuevos endpoints a `backend/apps/accounts/views.py`
    - `UserPermissionsView` (GET `/me/permissions/`, PATCH `/users/{id}/permissions/`): GET para cualquier autenticado; PATCH requiere `HasGranularPermission("can_manage_users")`, bloquea self-edit (403), solo actualiza campos enviados
    - `InvalidateSessionView` (POST `/{user_id}/invalidate-session/`): requiere `can_manage_users`, agrega JTI a `blacklist:{jti}` en Redis con TTL restante, `log(manage_user)`, 404 si user no existe, 403 si sin permiso
    - `UnlockUserView` (POST `/{user_id}/unlock/`): requiere `can_manage_users`, elimina `pin_fails` y `pin_blocked` de Redis, `log(manage_user)`, 400 si no estaba bloqueado
    - `ChangePinView` (POST `/me/change-pin/`): requiere PIN actual como confirmación, hashea y guarda nuevo PIN, requiere usuario autenticado
    - `WorkScheduleView` (PATCH `/users/{id}/schedule/`): requiere `can_manage_users`, bloquea self-edit (403), crea/actualiza/elimina `WorkSchedule`, 400 si validación falla
    - _Requirements: 2.3, 2.4, 6.6, 6.8, 7.3, 7.5, 7.6, 8.1, 8.2, 8.4, 8.7, 8.8, 11.3, 11.5, 11.6_
  - [ ]* 7.5 Write property test para session blacklist
    - **Property 20: Session blacklist round-trip**
    - **Property 21: TTL de blacklist entry coincide con vida restante del token**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.6**


- [x] 8. Actualizar accounts/urls.py y config/settings/base.py
  - [x] 8.1 Agregar las 6 rutas nuevas a `backend/apps/accounts/urls.py`
    - `path("me/permissions/", ...)`, `path("users/<uuid:pk>/permissions/", ...)`, `path("<uuid:user_id>/invalidate-session/", ...)`, `path("<uuid:user_id>/unlock/", ...)`, `path("me/change-pin/", ...)`, `path("users/<uuid:pk>/schedule/", ...)`
    - _Requirements: 2.5, 6.6, 7.5, 8.2, 11.6_
  - [x] 8.2 Actualizar JWT en `backend/config/settings/base.py`
    - Cambiar `ACCESS_TOKEN_LIFETIME` a `timedelta(minutes=15)` y `REFRESH_TOKEN_LIFETIME` a `timedelta(hours=8)`
    - Agregar `UPDATE_LAST_LOGIN` y custom claims serializer para incluir solo `user_id`, `role`, `jti` en el payload del access token
    - _Requirements: 10.1, 10.2, 10.5_
  - [ ]* 8.3 Write property test para payload JWT y validación de roles
    - **Property 1: Validación exhaustiva de roles**
    - **Property 23: Payload del JWT contiene solo los campos permitidos**
    - **Validates: Requirements 1.1, 1.4, 10.5**

- [x] 9. Agregar Celery beat task para expiración de WorkSchedule
  - [x] 9.1 Crear `check_schedule_expiry` en `backend/apps/accounts/tasks.py`
    - Busca usuarios con `WorkSchedule` cuyo `work_end` pasó hace más de 60 s (en `America/Santo_Domingo`)
    - Para cada usuario: agrega sus JTIs activos a `blacklist:{jti}` en Redis con TTL restante
    - `log(logout, detail={"reason": "schedule_end"})` por cada usuario afectado
    - Registrar en `CELERY_BEAT_SCHEDULE` en `backend/config/settings/base.py` con `crontab(minute='*')`
    - _Requirements: 7.3_

- [x] 10. Checkpoint — backend completo
  - Verificar que todos los endpoints del Design § Nuevos endpoints API responden correctamente
  - Verificar que `python manage.py check` no reporta errores
  - Asegurarse de que todos los tests pasan hasta este punto, preguntar al usuario si hay dudas

- [x] 11. Extender frontend/src/lib/types.ts
  - [x] 11.1 Agregar los 4 roles nuevos y las interfaces de seguridad a `frontend/src/lib/types.ts`
    - Extender `UserRole` con `'owner' | 'manager' | 'cashier' | 'bartender'`
    - Agregar interface `UserPermissions`: 7 campos booleanos + `discount_limit: number`
    - Agregar `default_route: string` y `permissions: UserPermissions` a la interface `AuthResponse`
    - _Requirements: 1.1, 2.1, 12.1_

- [x] 12. Extender frontend/src/stores/auth.store.ts
  - [x] 12.1 Agregar `permissions` al estado Zustand en `frontend/src/stores/auth.store.ts`
    - Agregar `permissions: UserPermissions | null` al estado e interface `AuthState`
    - Actualizar `setAuth` para recibir `permissions` como 4to argumento y persistirlo en el estado cifrado
    - Agregar `setPermissions(permissions: UserPermissions): void`
    - Actualizar `logout` para limpiar `permissions: null`
    - _Requirements: 12.2, 12.3_
  - [ ]* 12.2 Write property test para round-trip de permisos (frontend)
    - **Property 28: Round-trip de permisos entre backend y frontend**
    - **Property 29: Campos desconocidos en respuesta de permisos son ignorados silenciosamente**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**


- [ ] 13. Crear frontend/src/components/layout/PermissionGuard.tsx
  - [ ] 13.1 Crear `PermissionGuard` en `frontend/src/components/layout/PermissionGuard.tsx`
    - Props: `permission: keyof UserPermissions`, `children: React.ReactNode`
    - Si `permissions === null` o `permissions[permission] === false`: retorna `null` (oculta, no deshabilita)
    - Si `permissions[permission] === true`: retorna `<>{children}</>`
    - Usar `useAuthStore((s) => s.permissions)` para leer el estado
    - _Requirements: 2.6_

- [ ] 14. Crear frontend/src/hooks/useIdleTimer.ts
  - [ ] 14.1 Crear `useIdleTimer` en `frontend/src/hooks/useIdleTimer.ts`
    - Solo se activa cuando `useAuthStore(s => s.user) !== null`
    - Escucha `mousemove`, `keydown`, `touchstart`, `scroll` en `window`; cualquier evento reinicia counter a 600 s
    - `setInterval` de 1 s decrementa counter; a `0`: envía `AuditLog logout` → `logout()` → `navigate('/login')`
    - Cuando `timeLeft < 60`: `setShowWarning(true)`; cualquier evento durante el aviso oculta el aviso y reinicia
    - Usar `useCallback` para el listener de eventos; limpiar `removeEventListener` y `clearInterval` en cleanup del `useEffect`
    - Retorna `{ timeLeft: number, showWarning: boolean }`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [ ]* 14.2 Write property test para useIdleTimer
    - **Property 12: Inactivity_Timer se reinicia al 100% ante cualquier interacción**
    - **Property 13: Aviso de inactividad es visible si y solo si timer < 60**
    - **Property 14: Inactivity_Timer solo corre con usuario autenticado**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.7**

- [ ] 15. Actualizar frontend/src/components/layout/RoleGuard.tsx
  - [ ] 15.1 Compilar `RoleGuard.tsx` con el tipo `UserRole` extendido
    - El tipo `UserRole` ya fue extendido en tarea 11.1; verificar que `frontend/src/components/layout/RoleGuard.tsx` compila sin errores TypeScript
    - No hay lógica nueva: el componente usa `roles.includes(user.role)` que funciona igual con los 4 roles nuevos
    - _Requirements: 1.3_

- [ ] 16. Actualizar frontend/src/services/auth.service.ts
  - [ ] 16.1 Agregar los cinco nuevos métodos a `frontend/src/services/auth.service.ts`
    - `getMyPermissions(): Promise<UserPermissions>` → `GET /auth/me/permissions/`
    - `invalidateSession(userId: string, reason: string): Promise<void>` → `POST /auth/{userId}/invalidate-session/`
    - `unlockUser(userId: string): Promise<void>` → `POST /auth/{userId}/unlock/`
    - `changePin(currentPin: string, newPin: string): Promise<void>` → `POST /auth/me/change-pin/`
    - `updateSchedule(userId: string, schedule: WorkSchedulePayload | null): Promise<void>` → `PATCH /auth/users/{userId}/schedule/`
    - Verificar interceptor Axios existente en `frontend/src/services/api.ts`: si no maneja 401 → redirect `/login`, agregarlo
    - _Requirements: 8.5, 10.3, 10.4_

- [ ] 17. Checkpoint — frontend completo
  - Ejecutar `tsc --noEmit` en el frontend; verificar que no hay errores de tipos
  - Verificar que `RoleGuard`, `PermissionGuard` y `useIdleTimer` se integran correctamente en la app
  - Asegurarse de que todos los tests pasan hasta este punto, preguntar al usuario si hay dudas


- [ ] 18. Tests backend — unit tests
  - [ ] 18.1 Crear `backend/apps/accounts/tests/test_security.py`
    - Convertir `backend/apps/accounts/tests.py` a directorio `tests/` si no existe; agregar `__init__.py`
    - Flujos concretos a cubrir:
      - Login PIN OK → response incluye `permissions` y `default_route` correctos por rol
      - PIN fallido 5 veces → bloqueo 429 con `remaining_seconds`
      - PIN durante bloqueo activo → 429 sin validar valor del PIN
      - PIN correcto luego de N fallos → resetea counter, login exitoso
      - `WorkSchedule` dentro del horario → OK; fuera del horario → 403
      - Invalidar sesión: sin permiso → 403; `user_id` inexistente → 404; con permiso → 200
      - Desbloquear usuario no bloqueado → 400; usuario bloqueado → 200
      - Change PIN: sin PIN actual → 400; PIN actual incorrecto → 400; correcto → 200
      - `void_order` sin `reason` → 400; `reason` < 10 chars → 400; `reason` válida → ejecuta + AuditLog
      - Mock `AuditLog.save()` lanzando excepción → acción principal revertida (rollback)
      - Owner: `GET` endpoint de reporte → 200; `POST` endpoint protegido → 403
      - Usuario `is_active=False`: login → 403
      - Self privilege escalation: PATCH propio `role` → 403; PATCH propio permiso → 403
    - _Requirements: 2.4, 4.4, 4.5, 6.2, 6.3, 6.6, 6.8, 7.2, 8.2, 8.7, 9.3, 11.4, 11.5_

- [ ] 19. Tests backend — property tests (hypothesis)
  - [ ] 19.1 Crear `backend/apps/accounts/tests/test_security_properties.py`
    - Instalar `hypothesis[django]` si no está en `requirements.txt`
    - Cada propiedad anotada con `@settings(max_examples=100)` y comentario `# Property N: <título>`
    - Propiedades a implementar: 1, 2, 3, 5, 6, 7, 8, 9, 10, 15, 17, 18, 19, 22, 23, 24, 25, 26, 27, 30, 31
    - _Requirements: 1.1, 2.2, 2.3, 3.1, 3.3, 4.1, 4.3, 4.4, 4.5, 6.1, 6.7, 7.2, 7.5, 9.3, 10.5, 11.1, 11.2, 11.4, 11.5, 13.1, 13.2_

- [ ] 20. Tests frontend — unit tests (vitest)
  - [ ] 20.1 Crear `frontend/src/hooks/useIdleTimer.test.ts`
    - Timer no activo con `user === null`; `showWarning=true` cuando `timeLeft < 60`; logout cuando `timeLeft === 0`; evento reinicia timer a 600
    - _Requirements: 5.1, 5.3, 5.7_
  - [ ] 20.2 Crear `frontend/src/components/layout/PermissionGuard.test.tsx`
    - No renderiza children con permiso `false`; renderiza con `true`; no renderiza con `permissions === null`
    - `auth.store`: `setAuth` persiste `permissions`; `logout` limpia `permissions`
    - _Requirements: 2.6, 12.2_

- [ ] 21. Tests frontend — property tests (fast-check)
  - [ ] 21.1 Crear `frontend/src/stores/auth.store.property.test.ts`
    - Instalar `fast-check` si no está en `package.json`
    - Cada propiedad con `numRuns: 100` y comentario `// Property N: <título>`
    - Propiedades a implementar: 12, 13, 14, 28, 29
    - _Requirements: 5.1, 5.3, 5.7, 12.1, 12.2, 12.3, 12.4_

- [ ] 22. Checkpoint final — todos los tests pasan
  - Ejecutar `pytest backend/` y verificar que todos los tests pasan
  - Ejecutar `npx vitest --run frontend/` y verificar que todos los tests pasan
  - Asegurarse de que todos los tests pasan, preguntar al usuario si hay dudas


## Notes

- Tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- El principio de "no código innecesario" aplica a cada tarea: si una tarea puede resolverse modificando un archivo existente, no se crea uno nuevo.
- Redis ya está disponible en el proyecto (Channels + Celery). No se agrega ninguna dependencia nueva para rate limiting ni blacklist.
- `hypothesis[django]` y `fast-check` son las únicas dependencias nuevas de testing. Verificar si ya están instaladas antes de agregar.
- Las migraciones de T1 (roles), T2 (UserPermissions + WorkSchedule) y T3 (AuditLog) deben ejecutarse en orden antes de iniciar el frontend.
- `apps/audit/` es la única app nueva justificada: `AuditLog` recibe escrituras desde múltiples apps y viviría en `apps/accounts/` crearía acoplamiento circular.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["2.4", "3.5", "5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["7.5", "8.1", "8.2"] },
    { "id": 7, "tasks": ["8.3", "9.1"] },
    { "id": 8, "tasks": ["11.1"] },
    { "id": 9, "tasks": ["12.1"] },
    { "id": 10, "tasks": ["12.2", "13.1", "14.1", "15.1", "16.1"] },
    { "id": 11, "tasks": ["14.2", "18.1", "19.1"] },
    { "id": 12, "tasks": ["20.1", "20.2", "21.1"] }
  ]
}
```
