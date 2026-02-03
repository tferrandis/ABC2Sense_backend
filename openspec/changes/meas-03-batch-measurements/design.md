## Context

El endpoint individual POST /measurements ya existe. Necesitamos un endpoint batch para sync offline.

## Goals / Non-Goals

**Goals:**
- Endpoint batch para insertar hasta 20 medidas
- Resultado individual por cada medida (éxito/error)
- Reutilizar validaciones existentes

**Non-Goals:**
- Transacciones atómicas (si una falla, las demás se procesan igual)

## Decisions

### 1. Límite de batch
**Decisión**: Máximo 20 medidas por request.
**Rationale**: Balance entre eficiencia y carga del servidor.

### 2. Respuesta por item
**Decisión**: Devolver array con {index, success, id/error} por cada medida.
**Rationale**: Permite al cliente saber exactamente qué falló.

### 3. Procesamiento no atómico
**Decisión**: Cada medida se procesa independientemente.
**Rationale**: Simplicidad y permite guardar medidas válidas aunque algunas fallen.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Payload grande | Límite de 20 items |
| Inconsistencia parcial | Cliente maneja errores individuales |
