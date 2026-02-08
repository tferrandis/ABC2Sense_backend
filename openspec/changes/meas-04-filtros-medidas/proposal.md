## Why

El endpoint GET /measurements necesita filtros adicionales para soportar casos de uso como filtrar por sensor específico y permitir a admins consultar medidas de cualquier usuario.

## What Changes

- Agregar filtro `sensorId` para filtrar medidas que contengan un sensor específico
- Agregar filtro `userId` (solo admin) para consultar medidas de otros usuarios
- Soportar `radius_m` (metros) además de `radius` (km)

## Capabilities

### New Capabilities
- `measurement-filters`: Filtros adicionales para GET /measurements

### Modified Capabilities
<!-- Ninguna -->

## Impact

- **Código afectado**: `src/controllers/measurementsController.js`
- **API**: GET /measurements acepta nuevos query params
- **Compatibilidad**: Retrocompatible, nuevos params son opcionales
