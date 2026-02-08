## 1. Modelo

- [x] 1.1 Rediseñar schema en `src/models/sensorDefinition.js`: añadir campos `key`, `name`, `origin` (enum), `enabled` (default true), timestamps. Eliminar campo `measure`. Renombrar `title` a `name`.
- [x] 1.2 Añadir indexes únicos para `sensorId` y `key`
- [x] 1.3 Añadir pre-save hook para convertir `key` a uppercase

## 2. Controlador

- [x] 2.1 Actualizar `createSensorDefinition` en `src/controllers/sensorController.js` para aceptar nuevos campos: `sensorId`, `key`, `name`, `unit`, `description`, `origin`, `enabled`
- [x] 2.2 Actualizar `getSensorDefinitions` para retornar todos los campos del nuevo schema
- [x] 2.3 Añadir validación de duplicados para `key` además de `sensorId`

## 3. Validación

- [x] 3.1 Crear validador en `src/validators/sensorValidator.js` con express-validator: campos requeridos, enum origin, key formato alfanumérico uppercase

## 4. Rutas

- [x] 4.1 Actualizar `src/routes/sensorRoutes.js` para aplicar el validador en POST

## 5. Documentación API

- [x] 5.1 Actualizar apiDoc en el controlador con los nuevos campos y ejemplos
