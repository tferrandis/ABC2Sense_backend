## Context

El backend tiene un modelo `SensorDefinition` básico con 5 campos: `sensorId` (Number), `title`, `description`, `measure`, `unit`. No tiene timestamps, ni campo `enabled`, ni `origin`. El modelo `Measurement` referencia sensores mediante `sensor_id` (Mixed) en su array `measurements[]`. Actualmente solo existen dos endpoints: `POST /api/sensor/definitions` y `GET /api/sensor/definitions` sin paginación ni filtros.

## Goals / Non-Goals

**Goals:**
- Rediseñar el schema de `SensorDefinition` con campos completos: `id` numérico, `key` string, `name`, `unit`, `description`, `origin`, `enabled`, timestamps
- Mantener compatibilidad con `measurements[].sensor_id` existente (referencia numérica)
- Preparar el modelo para futuros endpoints admin (SENS-02..05)

**Non-Goals:**
- No se implementan endpoints nuevos en esta tarea (solo el modelo)
- No se implementa paginación en GET (eso es SENS-02)
- No se migran datos existentes en producción (aún no hay datos críticos)

## Decisions

### 1. ID numérico auto-incremental + key string

**Decisión**: Usar `sensorId` (Number, auto-incremental) como identificador técnico + `key` (String, unique) como identificador legible.

**Alternativas consideradas:**
- Solo `_id` de Mongo: descartado porque los dispositivos IoT envían `sensor_id` numérico en mediciones
- Solo string key: descartado porque las mediciones ya usan numérico y el firmware está preparado para números

**Rationale**: El `sensorId` numérico mantiene compatibilidad con el firmware del dispositivo y con el campo `measurements[].sensor_id`. El `key` string (ej: "PH", "TEMP", "HUM") facilita la legibilidad y búsqueda en admin.

### 2. Campo `origin` como enum

**Decisión**: Enum con valores `device`, `backend`, `manual`.

- `device`: sensor físico del hardware
- `backend`: sensor calculado/derivado por el backend
- `manual`: valor introducido manualmente por el usuario

**Rationale**: Permite filtrar y categorizar sensores según su fuente de datos.

### 3. Renombrar campos del schema actual

**Decisión**: `title` → `name`, eliminar `measure` (redundante con `description`).

| Actual | Nuevo | Motivo |
|--------|-------|--------|
| `sensorId` | `sensorId` | Se mantiene igual |
| `title` | `name` | Más estándar |
| `measure` | _(eliminado)_ | Redundante, se cubre con description |
| `unit` | `unit` | Se mantiene |
| `description` | `description` | Se mantiene |
| _(nuevo)_ | `key` | Identificador legible único |
| _(nuevo)_ | `origin` | Enum de fuente de datos |
| _(nuevo)_ | `enabled` | Soft-disable |
| _(nuevo)_ | `created_at` | Timestamp de creación |
| _(nuevo)_ | `updated_at` | Timestamp de actualización |

### 4. Timestamps con Mongoose

**Decisión**: Usar `{ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }` en el schema.

**Rationale**: Patrón ya usado en el proyecto, convención snake_case coherente.

## Risks / Trade-offs

- **[Breaking change en schema]** → Se reemplaza el modelo actual. Mitigación: no hay datos críticos en producción aún, y `sensorId` numérico se mantiene compatible.
- **[Campo `measure` eliminado]** → Datos existentes con `measure` se perderían. Mitigación: el campo era numérico y no se usaba correctamente (type Number para lo que debería ser texto).
- **[`key` debe ser único]** → Podría colisionar si se crean sensores sin validar. Mitigación: validación en el controlador + unique index en MongoDB.
