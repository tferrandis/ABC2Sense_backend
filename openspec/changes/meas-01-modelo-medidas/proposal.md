## Why

El modelo de medidas necesita campos adicionales y validaciones más estrictas para soportar dispositivos IoT, notas opcionales, y permitir que admins creen medidas en nombre de otros usuarios.

## What Changes

- Agregar campo `device_id` (opcional) para identificar el dispositivo que tomó la medida
- Agregar campo `notes` (opcional) para comentarios del usuario
- Permitir que admins especifiquen `user_id` en el body; usuarios normales usan su propio ID
- Validar que `measurements` tenga valores numéricos
- Asegurar que `lat/lon` acepten `null` explícitamente
- Usar server time si no se provee `timestamp`

## Capabilities

### New Capabilities
- `measurement-model`: Modelo de datos de medición con validaciones y soporte para admin

### Modified Capabilities
<!-- No hay specs existentes -->

## Impact

- **Código afectado**:
  - `src/models/measurement.js` - Agregar campos device_id y notes
  - `src/controllers/measurementsController.js` - Validaciones y lógica de admin
- **API**: El endpoint POST /api/measurements acepta nuevos campos opcionales
- **Compatibilidad**: Cambios retrocompatibles (campos opcionales)
