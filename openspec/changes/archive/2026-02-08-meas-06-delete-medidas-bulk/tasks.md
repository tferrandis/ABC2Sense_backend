## 1. Refactor filtros

- [x] 1.1 Extraer lógica de construcción de filtros de `getMeasurements` a función helper `buildMeasurementFilter(req)` en el controlador
- [x] 1.2 Refactorizar `getMeasurements` para usar `buildMeasurementFilter`

## 2. Endpoint DELETE bulk

- [x] 2.1 Implementar `deleteMeasurementsBulk` en el controlador: validar header X-Confirm, validar al menos un filtro, usar `buildMeasurementFilter`, ejecutar `deleteMany`
- [x] 2.2 Añadir validador para bulk delete en `src/validators/measurementsValidators.js`
- [x] 2.3 Añadir ruta `DELETE /` en `src/routes/measurements.js`

## 3. Documentación

- [x] 3.1 Añadir apiDoc al nuevo endpoint con todos los parámetros y ejemplos
