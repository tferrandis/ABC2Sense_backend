## Context

El endpoint GET /measurements ya implementa filtros combinables (from, to, lat, lng, radius, sensorId, userId). El DELETE bulk debe reutilizar exactamente la misma lógica de filtrado para garantizar consistencia. Ya existe `DELETE /measurements/:id` para borrado individual.

## Goals / Non-Goals

**Goals:**
- Reutilizar la lógica de filtrado de GET /measurements
- Proteger contra borrados accidentales con header de confirmación
- Admin puede borrar mediciones de otros usuarios via `userId`

**Non-Goals:**
- No implementar soft-delete (`deleted_at`) en esta iteración - requiere cambios en el modelo y todas las queries
- No implementar undo/rollback de borrados
- No añadir rate limiting (eso es MEAS-07)

## Decisions

### 1. Reutilizar lógica de filtrado

**Decisión**: Extraer la lógica de construcción de filtros de `getMeasurements` a una función helper `buildMeasurementFilter(req)` reutilizable por GET y DELETE.

**Rationale**: Evita duplicación de código y garantiza que DELETE filtre exactamente igual que GET.

### 2. Hard delete en lugar de soft-delete

**Decisión**: Usar `deleteMany()` en lugar de añadir campo `deleted_at`.

**Alternativa**: Soft-delete con `deleted_at` timestamp. Descartado porque requiere modificar el modelo Measurement, actualizar TODAS las queries existentes para excluir borrados, y añadir lógica de limpieza.

**Rationale**: La tarjeta dice "recomendado" no obligatorio. Se puede añadir soft-delete en una iteración futura sin breaking changes.

### 3. Confirmación via header

**Decisión**: Requerir header `X-Confirm: true` (no query param) para evitar borrados accidentales.

**Rationale**: Headers son más difíciles de enviar por accidente que query params. Patrón estándar en APIs destructivas.

### 4. Respuesta con preview

**Decisión**: Devolver `{ deleted: N }` tras el borrado. Sin preview previo - el usuario puede usar GET con los mismos filtros antes de borrar.

## Risks / Trade-offs

- **[Sin soft-delete]** → Los datos se pierden permanentemente. Mitigación: header de confirmación + el usuario puede hacer GET primero para verificar qué se borrará.
- **[Sin límite de borrado]** → Un admin podría borrar todas las mediciones. Mitigación: header obligatorio, y rate limiting vendrá en MEAS-07.
