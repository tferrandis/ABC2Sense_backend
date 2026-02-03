## Context

El modelo actual de Measurement tiene:
- `user_id`: ObjectId requerido
- `timestamp`: Date con default Date.now
- `location`: objeto con lat/long opcionales
- `measurements`: array de {sensor_id, value}

Falta soporte para device_id, notes, y validación de admins.

## Goals / Non-Goals

**Goals:**
- Agregar device_id y notes al schema
- Permitir admin especificar user_id en creación
- Validar que values en measurements sean numéricos
- Mantener retrocompatibilidad

**Non-Goals:**
- Cambiar estructura de measurements array (se mantiene)
- Implementar batch insert (eso es MEAS-03)

## Decisions

### 1. Campos opcionales
**Decisión**: Agregar `device_id: String` y `notes: String` como campos opcionales.

**Rationale**: No rompe compatibilidad, útil para tracking de dispositivos.

### 2. Admin user_id override
**Decisión**: En createMeasurement, si `req.user.role === 'admin'` y viene `user_id` en body, usarlo. Sino, usar `req.user._id`.

**Rationale**: Permite a admins crear medidas para otros usuarios sin cambiar el flujo normal.

### 3. Validación de measurements
**Decisión**: Validar que cada item en measurements tenga `sensor_id` y `value` numérico.

**Rationale**: Garantiza integridad de datos para análisis posterior.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Values no numéricos existentes | Solo validar en nuevas inserciones |
| Admin abuso de user_id | Logging de acciones admin |
