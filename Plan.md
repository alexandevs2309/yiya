# D'Yiya POS — Plan Rehecho (arquitectura local-first)

Este plan reemplaza el enfoque anterior. La premisa central que cambia todo:

> El sistema corre LOCAL en la computadora del restaurante (Django + Postgres vía Docker).
> Internet solo se usa para e-CF y backup. Todo lo demás funciona siempre.
> El cliente nunca ve Docker — solo un ícono de escritorio que abre el sistema.

---

## Fase 0 — Fundación del proyecto (antes de cualquier feature)

Esta fase configura la arquitectura base. Todo lo demás se construye encima.

### Paso 0.1 — Actualizar AGENTS.md con la arquitectura local-first

Antes de tocar código, actualiza tu `AGENTS.md` para que OpenCode entienda la premisa nueva.

**Prompt para OpenCode:**
```
Actualiza AGENTS.md agregando esta sección de arquitectura de despliegue:

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

No implementes nada que asuma que el backend vive en un servidor remoto
accesible por dominio público — toda referencia a "la API" es la IP local.
```

---

### Paso 0.2 — Configurar Docker para arranque automático y resiliencia

**Prompt para OpenCode:**
```
Crea o actualiza docker-compose.yml para producción local con estos requisitos:

1. Todos los servicios (django, postgres, redis, celery) deben tener
   `restart: always` para sobrevivir reinicios de Windows y cortes de luz.
2. PostgreSQL debe persistir datos en un volumen nombrado, NO en un
   contenedor efímero — los datos del restaurante no se pueden perder
   si el contenedor se recrea.
3. Django debe correr con Daphne (ASGI) para soportar WebSockets del KDS,
   no con runserver.
4. Expón el puerto de Django en 0.0.0.0:8000 (no 127.0.0.1) para que
   la tablet y el monitor de cocina puedan acceder por la red local
   usando la IP de la máquina.
5. Agrega un healthcheck a postgres y redis para que django espere
   a que estén listos antes de arrancar (depends_on con condition:
   service_healthy).
6. Crea un archivo .env.example documentando todas las variables
   necesarias (DB credentials, SECRET_KEY, ALANUBE_API_KEY, etc.)
   sin valores reales.

Sigue las convenciones ya descritas en AGENTS.md sobre arquitectura local-first.
```

---

### Paso 0.3 — Script de instalación de un solo uso

**Prompt para OpenCode:**
```
Crea un script de instalación llamado install.ps1 (PowerShell, para Windows)
que un técnico (yo) correrá UNA SOLA VEZ en la computadora del restaurante
durante la instalación inicial. El script debe:

1. Verificar si Docker Desktop está instalado; si no, mostrar instrucciones
   de descarga e instalación manual (no podemos automatizar la instalación
   de Docker Desktop en sí).
2. Configurar Docker Desktop para iniciar automáticamente con Windows
   (esto requiere documentar el paso manual en Settings > General si no
   se puede automatizar vía registro de Windows).
3. Copiar .env.example a .env si no existe, y pausar para que yo
   complete las credenciales reales.
4. Correr `docker compose up -d --build` para levantar todo.
5. Crear un acceso directo en el escritorio del usuario que abra
   http://localhost:8000 en el navegador predeterminado, con el ícono
   de D'Yiya (asume que existe un archivo dyiya-icon.ico en el repo).
6. Al final, mostrar un mensaje claro: "Instalación completa. El cliente
   puede usar el ícono D'Yiya POS en el escritorio para abrir el sistema."

Este script es solo para mí como técnico, no para el cliente final.
```

---

## Fase 1 — Núcleo operacional offline-first (sin esto no hay sistema)

Esta es la base de todo: mesas, menú, órdenes, cocina, cobro. Debe funcionar
sin internet desde el día uno.

### Paso 1.1 — Auditoría de lo que ya existe

Antes de construir, que tu agente audite qué hay realmente (recuerda que
dijiste "no estoy seguro qué tan avanzado está el código").

**Prompt para OpenCode:**
```
Audita el estado real del código en este repositorio. Genera un reporte
en AUDITORIA_REAL.md que liste:

1. Qué apps de Django existen y cuáles tienen modelos reales vs. vacíos
2. Qué endpoints de API existen y responden correctamente (pruébalos)
3. Qué páginas de React existen y si renderizan sin errores
4. Qué tan completo está el sistema de autenticación/roles
5. Si existe algún flujo end-to-end que funcione hoy (ej. crear una
   orden y verla en el KDS)
6. Qué falta para que el flujo MÍNIMO funcione: abrir mesa, agregar
   ítems del menú, enviar a cocina, cobrar

Sé honesto y específico — necesito saber el estado real, no una
descripción optimista. Si algo está mockeado o hardcodeado, dilo.
```

---

### Paso 1.2 — Flujo mínimo operacional (MVP real)

**Prompt para OpenCode:**
```
Basándote en AUDITORIA_REAL.md, implementa o completa el flujo mínimo
operacional end-to-end:

1. Login con PIN para waitress/cashier/cook (ya descrito en AGENTS.md)
2. Ver plano de mesas con estado (libre/ocupada)
3. Abrir una mesa, agregar ítems del menú a la orden
4. Enviar la orden a cocina (debe aparecer en el KDS vía WebSocket
   en tiempo real, sin necesidad de refrescar)
5. Cocina marca ítems como listos
6. Cajero cierra la cuenta: calcula ITBIS 18% + propina de ley 10%,
   registra el método de pago (efectivo por ahora, CardNET después)
7. Imprime o muestra un recibo PROVISIONAL (no e-CF todavía — eso es
   fase aparte)

Todo este flujo debe funcionar sin ninguna llamada a internet. Verifica
que no haya ninguna dependencia de servicios externos en este flujo.

Al terminar, dame instrucciones claras de cómo probarlo manualmente
end-to-end.
```

---

### Paso 1.3 — Modo avión real (prueba de que funciona offline)

**Prompt para OpenCode:**
```
Necesito verificar que el flujo operacional implementado en el paso
anterior funciona genuinamente sin internet. Implementa lo necesario
para que:

1. El frontend (React/PWA) cachee correctamente vía Service Worker
   los assets necesarios para funcionar sin red
2. Las llamadas a la API que fallan por falta de red se encolen en
   IndexedDB en lugar de fallar silenciosamente
3. Exista un indicador visual claro (NetworkBadge) en la topbar que
   muestre si estamos online u offline

Después, dame un procedimiento de prueba manual: qué pasos seguir
desconectando el router/Wi-Fi para confirmar que el sistema sigue
operando (abrir mesa, ordenar, cobrar en efectivo) incluso sin internet.
```

---

## Fase 2 — Capa fiscal (e-CF) como proceso aparte

Aquí es donde SÍ se necesita internet, pero de forma asíncrona y sin
bloquear la operación.

### Paso 2.1 — Cola asíncrona de e-CF

**Prompt para OpenCode:**
```
Implementa el envío de e-CF como un proceso asíncrono separado de la
operación de cobro, siguiendo este principio: el cajero cobra y el
restaurante sigue operando AUNQUE el e-CF no se haya enviado todavía.

1. Al cerrar una cuenta, crea un registro ECFDocument con estado "pending"
2. Una tarea Celery intenta enviar el e-CF a Alanube/ef2 en segundo plano
3. Si falla por falta de internet o error de la API, reintenta con
   backoff exponencial (5 intentos, ej. 1min, 5min, 15min, 1h, 6h)
4. Si los 5 reintentos fallan, marca el documento como "failed" y
   créame una vista de administrador donde pueda ver documentos
   fallidos y forzar un reenvío manual
5. Cuando el e-CF se emite exitosamente, dispara el envío del NCF
   por WhatsApp al cliente (puedes simular esto por ahora con un log,
   no implementes la integración real de WhatsApp todavía)

Esto debe construirse de forma que NUNCA bloquee el flujo de cobro
del cajero — el cobro se completa y el e-CF se procesa después.
```

---

### Paso 2.2 — Validación RNC (Módulo 11)

**Prompt para OpenCode:**
```
Implementa la validación del algoritmo Módulo 11 de la DGII para
validar RNC dominicanos (9 dígitos) y cédulas (11 dígitos).

1. Función de validación en el backend (apps/billing/ o apps/core/)
   reutilizable, con tests unitarios cubriendo casos válidos e inválidos
2. Validación en tiempo real en el frontend cuando el cajero ingresa
   el RNC del cliente — mostrar error inmediato si el dígito
   verificador no coincide, antes de intentar enviar el e-CF
3. No permitir generar e-CF con RNC inválido — debe bloquear con
   mensaje claro al cajero
```

---

## Fase 3 — Hardware: impresión local sin Docker complications

### Paso 3.1 — Puente de impresión ESC/POS

**Prompt para OpenCode:**
```
Diseña (no implementes aún, solo dame el plan técnico) un puente de
impresión local para impresoras térmicas ESC/POS USB. El problema:
el navegador no puede hablar directamente con una impresora USB.

Opciones a evaluar y comparar en un documento PRINTING_OPTIONS.md:
1. Un pequeño servicio local (Python/Flask o Node) corriendo en la
   misma computadora, en un puerto como localhost:9100, que reciba
   el texto a imprimir vía POST y lo mande a la impresora usando
   una librería como python-escpos
2. Impresión vía navegador con window.print() a una impresora
   configurada como predeterminada (más simple pero menos control
   sobre el formato ESC/POS)
3. Impresoras de red (LAN) que el navegador puede alcanzar
   directamente por IP sin puente local

Recomiéndame cuál conviene más dado que el cliente aún no ha elegido
la marca/modelo de impresora, y dame los pros/contras de cada uno
pensando en que el cliente no debe instalar ni configurar nada técnico.
```

---

## Fase 4 — Experiencia "sin Docker" para el cliente

### Paso 4.1 — Modo kiosko en el navegador

**Prompt para OpenCode:**
```
Configura el frontend para que pueda correr en modo kiosko (pantalla
completa, sin barra de navegador) cuando se abra en la computadora
de caja, mientras sigue siendo accesible normalmente desde la tablet.

1. Documenta cómo lanzar Chrome/Edge en modo kiosko apuntando a
   localhost:8000 (esto va en el acceso directo de escritorio,
   no en el código React)
2. Asegura que la PWA tenga un manifest.json correcto para que
   "Agregar a pantalla de inicio" funcione bien en la tablet Android,
   dando una experiencia de app nativa ahí también
3. Agrega una pantalla de "instalar como app" la primera vez que se
   abre desde un navegador normal, guiando al mesero a instalar la PWA
```

---

## Orden recomendado de ejecución

1. **Semana 1**: Fase 0 completa (arquitectura local-first configurada y probada)
2. **Semana 1-2**: Fase 1 completa (flujo operacional offline funcionando end-to-end)
3. **Semana 2-3**: Fase 2 completa (e-CF asíncrono, sin bloquear operación)
4. **Semana 3**: Fase 3 (plan de impresión, implementación cuando el cliente decida hardware)
5. **Semana 3-4**: Fase 4 (pulido de experiencia sin Docker para el cliente)

Cada fase termina en algo DEMOSTRABLE al cliente — no features a medias.
Fase 1 sola ya es un sistema usable que un restaurante podría operar,
aunque sin facturación electrónica. Eso te da margen para negociar precio
con el cliente mostrando avances reales, no solo promesas.

---

## Antes de escribir más código — la conversación pendiente con el cliente

Recuerda: aún no has hablado de precio, urgencia real, ni si puedes
reutilizar el código para otros restaurantes. Sugerencia de mensaje
para esa conversación:

```
[Para ti, no para OpenCode — esto lo escribes tú al cliente]

Quiero alinear contigo el plan antes de seguir construyendo:

1. He definido la arquitectura técnica — el sistema va a funcionar
   incluso sin internet (excepto para las facturas electrónicas,
   que la ley exige que se envíen a la DGII).

2. Para avanzar con tranquilidad de ambos lados, necesito que
   conversemos: ¿cuál es tu presupuesto para esto?, ¿para cuándo
   lo necesitas operando?, y una pregunta importante — como
   desarrollador, parte de mi interés en este proyecto es poder
   ofrecer este mismo sistema (adaptado) a otros restaurantes en
   el futuro. ¿Te parece bien esa estructura, o prefieres ser
   dueño exclusivo del sistema?

Quiero que ambos sepamos qué esperar antes de seguir invirtiendo tiempo.
```