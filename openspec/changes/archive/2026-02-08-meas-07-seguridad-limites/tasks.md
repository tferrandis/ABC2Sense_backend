## 1. Indexes

- [x] 1.1 Añadir compound index `{ user_id: 1, timestamp: -1 }` al schema de Measurement
- [x] 1.2 Añadir index `{ "measurements.sensor_id": 1 }` al schema de Measurement

## 2. Rate limiting

- [x] 2.1 Crear middleware de rate limiting en `src/middlewares/rateLimiter.js` con configuración por env vars
- [x] 2.2 Aplicar rate limiter a POST /measurements (100/min), POST /batch (10/min), DELETE / (5/min) en las rutas
