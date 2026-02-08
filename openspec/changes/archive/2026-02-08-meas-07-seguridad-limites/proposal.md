## Why

Los endpoints de medidas no tienen rate limiting ni indexes optimizados. Un usuario o bot podría saturar el backend con requests masivos a POST, y las queries de GET/DELETE con filtros son lentas sin indexes adecuados.

## What Changes

- Rate limiting en POST /api/measurements y POST /api/measurements/batch
- Límite máximo de payload (20 mediciones por batch, ya implementado; añadir validación de tamaño máximo de measurements array en POST individual)
- Indexes de MongoDB: compound index `(user_id, timestamp)`, index en `measurements.sensor_id`
- Rate limiter configurable via variables de entorno

## Capabilities

### New Capabilities
- `measurement-security`: Rate limiting y validaciones de seguridad en endpoints de medidas

### Modified Capabilities

## Impact

- **Dependencias**: Nueva dependencia `express-rate-limit`
- **Middleware**: Nuevo rate limiter middleware
- **Modelo**: `src/models/measurement.js` - Añadir indexes
- **Rutas**: `src/routes/measurements.js` - Aplicar rate limiter
