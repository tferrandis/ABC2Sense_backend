## Context

El backend ABC2Sense ya tiene un sistema de autenticación básico con:
- Modelo User con campos: username, email, password, role (con default 'user'), uuid, registrationDate
- Validadores en `authValidators.js` que ya validan email y fuerza de contraseña
- Endpoint `POST /api/auth/register` que solo devuelve `{message: 'User registered successfully'}`
- Sistema JWT implementado para login que devuelve access token

El problema actual es que el registro no devuelve tokens, forzando al usuario a hacer login inmediatamente después de registrarse.

## Goals / Non-Goals

**Goals:**
- Devolver access token y refresh token tras registro exitoso
- Agregar campo `emailVerified` al modelo User para futura verificación de email
- Mantener compatibilidad con las validaciones existentes
- Verificar unicidad de email antes de crear usuario

**Non-Goals:**
- Implementar envío de email de confirmación (solo stub/flag)
- Modificar el flujo de login existente
- Implementar refresh token rotation (se usará el mismo enfoque que login)

## Decisions

### 1. Respuesta del registro con tokens
**Decisión**: Devolver la misma estructura que el login: `{user, token, refreshToken, expiresAt}`

**Alternativas consideradas**:
- Solo devolver accessToken → Rechazado: inconsistente con login, requeriría otro endpoint para refresh
- Devolver solo mensaje y forzar login → Rechazado: mala UX, duplica llamadas

**Rationale**: Consistencia con el endpoint de login y mejor experiencia de usuario.

### 2. Campo emailVerified
**Decisión**: Agregar `emailVerified: { type: Boolean, default: false }` al modelo User

**Alternativas consideradas**:
- No agregar el campo hasta implementar verificación → Rechazado: requeriría migración después
- Usar campo `status` con enum → Rechazado: over-engineering para V1

**Rationale**: Preparar el modelo para futura verificación sin bloquear el registro actual.

### 3. Generación de refresh token
**Decisión**: Usar JWT con mayor duración (7 días) como refresh token, similar al patrón existente.

**Alternativas consideradas**:
- Tokens opacos en base de datos → Rechazado: complejidad adicional, no alineado con implementación actual
- Sin refresh token → Rechazado: contradice requisitos de la tarjeta

**Rationale**: Mantener consistencia con la arquitectura JWT existente.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking change en respuesta de API | Documentar en changelog, versión de API si es necesario |
| Refresh token sin rotación es menos seguro | Aceptable para V1, implementar rotación en fase posterior |
| Email no verificado permite acceso completo | Flag preparado para futura restricción de funcionalidades |
