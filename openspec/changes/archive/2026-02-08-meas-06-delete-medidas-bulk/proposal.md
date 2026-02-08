## Why

Actualmente solo se puede eliminar una medición por ID (`DELETE /measurements/:id`). No existe forma de eliminar mediciones en bulk usando filtros (por rango de fechas, sensor, ubicación). Esto es necesario para que los usuarios puedan limpiar datos incorrectos o antiguos de forma eficiente.

## What Changes

- Nuevo endpoint `DELETE /measurements` que reutiliza los mismos filtros que GET
- Requiere confirmación explícita via header `X-Confirm: true` para prevenir borrados accidentales
- Admin puede filtrar por `userId` para borrar mediciones de otros usuarios
- Hard delete (no soft-delete por ahora, se evaluará en futuras iteraciones)
- Respuesta incluye count de mediciones eliminadas

## Capabilities

### New Capabilities
- `bulk-delete-measurements`: Endpoint para eliminar mediciones en bulk usando filtros combinables con confirmación de seguridad

### Modified Capabilities

## Impact

- **Controlador**: `src/controllers/measurementsController.js` - Nueva función `deleteMeasurementsBulk`
- **Rutas**: `src/routes/measurements.js` - Nuevo `DELETE /` con validador
- **Validador**: `src/validators/measurementsValidators.js` - Nuevo validador para bulk delete
- **Seguridad**: Header de confirmación obligatorio para prevenir borrados accidentales
