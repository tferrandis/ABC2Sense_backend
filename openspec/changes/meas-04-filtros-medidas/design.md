## Context

GET /measurements ya tiene: from, to, lat, lng, radius, page, limit.
Falta: sensorId, userId (admin), radius_m.

## Goals / Non-Goals

**Goals:**
- Filtro sensorId para buscar medidas con un sensor específico
- Filtro userId para admins
- Soporte radius_m (metros)

**Non-Goals:**
- Cursor-based pagination (mantener page-based por ahora)

## Decisions

### 1. Filtro sensorId
**Decisión**: Usar `$elemMatch` en el array measurements para filtrar por sensor_id.
**Rationale**: Permite encontrar medidas que contengan lecturas de un sensor específico.

### 2. Admin userId filter
**Decisión**: Si `req.user.role === 'admin'` y viene `userId`, usar ese. Sino, usar `req.user._id`.
**Rationale**: Consistente con createMeasurement.

### 3. radius_m
**Decisión**: Si viene `radius_m`, convertir a km (`radius_m / 1000`). `radius` tiene prioridad.
**Rationale**: Flexibilidad para clientes que prefieren metros.
