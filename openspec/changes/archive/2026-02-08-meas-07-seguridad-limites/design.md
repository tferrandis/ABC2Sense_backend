## Context

Los endpoints de medidas son los más usados del API (POST desde dispositivos IoT, GET desde la app). No hay rate limiting ni indexes optimizados.

## Goals / Non-Goals

**Goals:**
- Rate limiting en endpoints de escritura (POST, POST /batch, DELETE bulk)
- Indexes para queries frecuentes
- Configuración via env vars

**Non-Goals:**
- No implementar rate limiting global (solo en measurements)
- No implementar IP-based limiting (usar per-user con JWT)
- No implementar WAF o protección DDoS a nivel infra

## Decisions

### 1. Rate limiting per-user con express-rate-limit

**Decisión**: Usar `express-rate-limit` con key extractor basado en `req.user._id` (post-auth).

**Config por defecto:**
- POST /measurements: 100 requests por minuto por usuario
- POST /measurements/batch: 10 requests por minuto por usuario
- DELETE /measurements (bulk): 5 requests por minuto por usuario

**Rationale**: Per-user es más justo que per-IP (múltiples usuarios detrás de NAT). Los dispositivos IoT envían datos cada pocos minutos, 100/min es suficiente.

### 2. Indexes de MongoDB

**Decisión**: Añadir compound indexes al schema:
- `{ user_id: 1, timestamp: -1 }` - Query principal de GET (filtro por usuario + orden por fecha)
- `{ "measurements.sensor_id": 1 }` - Filtro por sensor

**Rationale**: Son los patrones de query más frecuentes. El compound index cubre tanto filtro como sort.

### 3. Configuración via env vars

**Decisión**: Variables `RATE_LIMIT_MEASUREMENTS_POST`, `RATE_LIMIT_MEASUREMENTS_BATCH`, `RATE_LIMIT_MEASUREMENTS_DELETE` con defaults razonables.

## Risks / Trade-offs

- **[Rate limit bloquea dispositivos legítimos]** → Defaults conservadores (100/min), configurable via env.
- **[Indexes ralentizan writes]** → Trade-off aceptable, las reads son mucho más frecuentes.
