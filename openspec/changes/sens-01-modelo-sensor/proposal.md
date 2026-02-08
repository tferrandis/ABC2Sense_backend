## Why

El modelo actual de sensores (`SensorDefinition`) es demasiado básico: solo tiene `sensorId`, `title`, `measure`, `unit` y `description`. No soporta habilitar/deshabilitar sensores, no tiene campo `origin` para distinguir la fuente de datos, ni timestamps de auditoría. Esto limita la gestión del catálogo de sensores y la futura administración desde un panel admin.

## What Changes

- Rediseñar el modelo `SensorDefinition` para incluir campos adicionales: `key`, `name`, `origin`, `enabled`, `created_at`
- Añadir enum `origin` con valores: `device`, `backend`, `manual`
- Usar `id` numérico auto-incremental + `key` string como identificador legible (ej: "PH", "TEMP")
- Añadir campo `enabled` (boolean, default true) para soft-disable de sensores
- Añadir timestamps (`created_at`, `updated_at`)
- Actualizar el controlador y rutas existentes para reflejar el nuevo schema
- **BREAKING**: El campo `sensorId` se renombra a `id` (numérico) + `key` (string)

## Capabilities

### New Capabilities
- `sensor-catalog`: Define el modelo de datos del catálogo de sensores, incluyendo schema, validaciones, enums y campos de auditoría

### Modified Capabilities
_(ninguna - el modelo actual se reemplaza completamente)_

## Impact

- **Modelo**: `src/models/sensorDefinition.js` - Rediseño completo del schema
- **Controlador**: `src/controllers/sensorController.js` - Actualizar lógica de creación y listado
- **Rutas**: `src/routes/sensorRoutes.js` - Sin cambios en endpoints, pero validaciones actualizadas
- **Mediciones**: Las mediciones referencian `sensor_id` numérico en su array `measurements[]`, debe ser compatible con el nuevo `id` del sensor
- **Seed/Scripts**: `src/addsensor.js` necesitará actualización
- **Base de datos**: Migración de datos existentes en `sensordefinitions` collection
