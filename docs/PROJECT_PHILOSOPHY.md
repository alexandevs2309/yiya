# Constitución Técnica — D'Yiya Restaurant's POS

> **Autoridad máxima del proyecto.**
> Este documento no describe cómo está implementado el código.
> Describe los principios que **nunca deben romperse**.
> Cualquier decisión técnica, arquitectural o de producto debe validarse contra estos principios.
> **Si una petición contradice esta constitución, debe advertirse antes de implementarla.**

---

## 1. Local-First

El restaurante siempre debe poder operar **sin Internet**.

- Ninguna venta depende de un servicio externo.
- PostgreSQL es la única fuente de verdad.
- Internet solo sincroniza servicios externos (Alanube/DGII para e-CF, backups opcionales a S3).
- `docker-compose` con `restart: always` en todos los servicios garantiza operación continua tras reinicios o cortes de luz.
- Las tablets de meseros y el monitor de cocina acceden por **Wi-Fi local** a la IP de la computadora de caja — nunca por Internet.

> **Regla de oro:** Si no funciona sin Internet, está mal diseñado.

---

## 2. Single Source of Truth

Toda la información importante vive en **PostgreSQL**.

- No duplicar lógica de negocio entre frontend y backend.
- No crear estados inconsistentes entre capas de la aplicación.
- La base de datos es el único estado canónico; el frontend es una proyección de ese estado.
- No mantener "verdad paralela" en caché, memoria o frontend que no tenga reconciliación con la BD.

> **Regla de oro:** Si hay una discrepancia entre la BD y cualquier otra capa, la BD tiene razón.

---

## 3. Simplicidad Operativa

No introducir infraestructura innecesaria.

- Cada nueva dependencia debe justificar su existencia por escrito (ver §8 Arquitectura).
- La solución más simple que cumpla los requisitos es la preferida.
- Si no está en `docker-compose.yml`, no existe en el sistema productivo.
- El operador/dueño del restaurante **nunca debe ver** Docker, terminales ni comandos; accede vía acceso directo de escritorio.

> **Regla de oro:** Complejidad no es sinónimo de robustez. Cada pieza extra es un punto de fallo extra.

---

## 4. Seguridad

Todas las acciones críticas requieren autorización explícita.

- Todas las acciones críticas quedan registradas en el log de auditoría.
- Nunca confiar en el frontend: toda validación de negocio y autorización se ejecuta en **backend**.
- Autenticación JWT para staff + PIN para meseros en flujos rápidos.
- Acciones destructivas (anular orden, aplicar descuento, cerrar caja) requieren rol y registro.
- Los secretos viven en `.env`; nunca en el código ni en el repositorio.

> **Regla de oro:** El frontend es conveniente, no confiable.

---

## 5. Observabilidad

Todo error importante debe registrarse.

- Todo proceso crítico debe poder monitorearse (estado de servicios, colas de e-CF, WebSockets activos).
- El sistema debe explicar qué ocurre: logs estructurados, health checks, trazabilidad de errores.
- Un error silencioso es peor que un error visible.
- El staff no técnico debe poder ver el estado del sistema sin interpretar logs.

> **Regla de oro:** Si no puedes monitorear algo, no puedes garantizar que funciona.

---

## 6. Recuperación

Todo fallo debe poder recuperarse sin pérdida de información.

- Nunca perder datos de ventas, órdenes o pagos, bajo ninguna circunstancia.
- Operaciones críticas deben ser **idempotentes** (pueden reintentarse sin efecto secundario doble).
- El sistema prioriza la recuperación automática: retry, reconciliación, fallback.
- Los backups nocturnos opcionales a S3 no reemplazan la durabilidad local de PostgreSQL.

> **Regla de oro:** Un sistema que pierde datos no es un sistema.

---

## 7. Design System

Todo componente nuevo debe utilizar el **Design System de D'Yiya** (`docs/design-system/`).

- **PROHIBIDO** usar colores hardcodeados (`#hex`, `rgb()`, clases Tailwind de paleta como `text-blue-500`, `bg-emerald-400`, etc.) — usar siempre variables semánticas (`text-primary`, `bg-destructive/10`, etc.).
- **PROHIBIDO** usar `<button>` raw — siempre el componente `<Button>` con sus variantes.
- **PROHIBIDO** duplicar componentes que ya existen en el Design System.
- **PROHIBIDO** modales inline — usar siempre el componente `<Modal>`.
- **PROHIBIDO** sombras o radios custom — usar solo los tokens definidos.
- Todo debe funcionar en **Light y Dark Mode** (dark mode por clase `<html class="dark">`, nunca por `@media`).
- Íconos: solo `lucide-react`. Tipografía: Inter (body) + Cormorant Garamond (headings).

> **Regla de oro:** El usuario ve el Design System, no el código. Consistencia visual es profesionalismo.

---

## 8. Arquitectura

La arquitectura actual queda **congelada**.

- Stack definido: Django 5.2 + DRF + Daphne (ASGI), PostgreSQL 17, Redis 7 + Celery, React 19 + Vite + TailwindCSS.
- **No introducir** Redis adicional, RabbitMQ, nuevas bases de datos, servicios de terceros, microservicios u otra infraestructura sin un documento **ADR** (`docs/adr/`) que justifique técnicamente:
  1. Qué problema resuelve que no puede resolverse con la arquitectura actual.
  2. Qué complejidad operacional agrega.
  3. Cómo afecta el requisito Local-First.
- Apps Django en `backend/apps/`: `core`, `pos`, `billing`, `inventory`.
- Modelos con `UUIDField` como primary key. Timestamps `created_at` / `updated_at` en todo modelo.
- Migraciones Django (no raw SQL). Nunca modificar migraciones ya aplicadas en producción.

> **Regla de oro:** Toda adición arquitectural debe ganar su lugar. El statu quo tiene ventaja.

---

## 9. Calidad

No existe código de producción sin pruebas.

- No implementar funcionalidades sin pruebas (unitarias y/o de integración).
- La lógica fiscal (ITBIS 18%, Propina Legal 10%, validación RNC, generación NCF) tiene cobertura de tests obligatoria.
- No introducir deuda técnica deliberadamente; si existe, debe documentarse y planificarse su resolución.
- No romper compatibilidad existente (contratos de API, esquema de BD, comportamiento de WebSockets).
- Estilo de código: `black` + `isort` + `ruff` en backend; TypeScript estricto en frontend.
- Commits convencionales: `feat:`, `fix:`, `chore:`, `docs:`.

> **Regla de oro:** El código que no está probado está roto hasta que se demuestre lo contrario.

---

## 10. Filosofía

Estamos construyendo una **plataforma para operar restaurantes**.

- No un conjunto de pantallas desconectadas.
- No un proyecto de demostración.
- Cada decisión técnica debe evaluarse desde la perspectiva del restaurante real que lo usará todos los días.
- La experiencia del mesero, del cajero y del cocinero importa tanto como la arquitectura.
- Cada decisión futura deberá respetar estos principios.

> **Regla de oro:** Si no mejora la operación del restaurante, no pertenece al sistema.

---

## Jerarquía de Autoridad

| Nivel | Documento | Prevalece sobre |
|-------|-----------|----------------|
| 1 | **Esta Constitución** (`docs/PROJECT_PHILOSOPHY.md`) | Todo lo demás |
| 2 | **Design System** (`docs/design-system/`) | Implementación visual |
| 3 | **ADRs** (`docs/adr/`) | Decisiones de arquitectura puntuales |
| 4 | **Roadmap / Plan** (`Plan.md`) | Priorización y alcance |
| 5 | **Código** | Implementación concreta |

> Si el código contradice la Constitución → **el código está mal**.
> Si un prompt contradice la Constitución → **el prompt debe advertirse antes de ejecutarse**.

---

## Cálculos Fiscales (República Dominicana) — Referencia Rápida

Estos cálculos son inmutables por ley. Nunca modificar la lógica sin actualizar también los tests fiscales.

```
ITBIS     = subtotal × 0.18
Propina   = subtotal × 0.10
Total     = subtotal + ITBIS + Propina
```

- ITBIS e Propina se calculan sobre el **subtotal base**, nunca sobre sí mismos.
- Los e-CF deben cumplir el esquema DGII: NCF, RNC, ITBIS desglosado.

---

*Versión 1.0 — Establecida antes del Sprint 2*
