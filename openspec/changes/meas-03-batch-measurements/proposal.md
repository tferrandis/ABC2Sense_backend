## Why

Para sincronización offline, la app necesita enviar múltiples medidas acumuladas en una sola petición. Esto reduce latencia y mejora la experiencia cuando el dispositivo recupera conectividad.

## What Changes

- Nuevo endpoint `POST /measurements/batch`
- Acepta array de medidas
- Devuelve resultado por cada item (ok/error)
- Límite de 20 medidas por batch

## Capabilities

### New Capabilities
- `batch-measurements`: Endpoint para insertar múltiples medidas en una sola petición

### Modified Capabilities
<!-- Ninguna -->

## Impact

- **Código afectado**:
  - `src/controllers/measurementsController.js` - Nueva función
  - `src/routes/measurementsRoutes.js` - Nueva ruta
- **API**: Nuevo endpoint POST /api/measurements/batch
