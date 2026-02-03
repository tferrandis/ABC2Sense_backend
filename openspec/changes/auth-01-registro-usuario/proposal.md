## Why

El sistema necesita un endpoint de registro de usuarios robusto con validaciones de seguridad, asignación de roles y respuesta con tokens JWT para permitir autenticación inmediata tras el registro. El endpoint actual carece de validaciones y no devuelve tokens.

## What Changes

- Mejorar endpoint `POST /auth/register` con validaciones de email y contraseña
- Agregar validación de fuerza de contraseña (mínimo 8 caracteres, mayúsculas, números)
- Asignar rol por defecto `user` a nuevos registros
- Devolver tokens (access + refresh) en la respuesta de registro exitoso
- Agregar flag `emailVerified: false` como stub para futura confirmación de email
- Agregar validación de email único y formato válido

## Capabilities

### New Capabilities
- `user-registration`: Registro de usuarios con validaciones de seguridad, asignación de rol por defecto y respuesta con tokens JWT

### Modified Capabilities
<!-- No hay capabilities existentes que modificar a nivel de spec -->

## Impact

- **Código afectado**:
  - `src/controllers/authController.js` - Lógica de registro
  - `src/models/user.js` - Agregar campo `role` y `emailVerified`
  - `src/routes/authRoutes.js` - Posible validador de entrada
- **API**: El endpoint `POST /api/auth/register` cambiará su respuesta de `{message}` a `{user, accessToken, refreshToken, expiresAt}`
- **Dependencias**: express-validator (si no existe)
- **Breaking change**: Clientes que esperen solo `{message}` deberán actualizarse
