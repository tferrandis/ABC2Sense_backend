# Design: Measurements Ingestion

## Model Changes

Add to MeasurementSchema:
| Field                 | Type    | Notes                                    |
|-----------------------|---------|------------------------------------------|
| client_measurement_id | String  | Client-generated unique ID for idempotency |
| timestamp_device_ms   | Number  | Device timestamp in milliseconds         |
| source                | String  | e.g. 'manual', 'ble', 'scheduled'        |
| location_used         | Boolean | Whether location was used for this measurement |
| capture_with_gps      | Boolean | Whether GPS was active during capture    |
| notebook_id           | String  | Optional reference to a notebook         |

### Idempotency
- Compound unique index: `{ user_id: 1, client_measurement_id: 1 }` (sparse, allows null)
- On duplicate: return existing record as "duplicated" instead of error

## Endpoint Changes

### POST /api/measurements (single)
- Accept new fields in body
- If client_measurement_id provided and duplicate exists: return 200 with status "duplicated"
- If new: return 201 with status "inserted"

### POST /api/measurements/bulk (renamed from /batch)
- Keep /batch as alias for backward compat
- Per-item result status: `inserted | duplicated | failed`
- Idempotency check per item using client_measurement_id

## Response Format

Single:
```json
{ "status": "inserted|duplicated", "measurement": {...} }
```

Bulk:
```json
{
  "results": [
    { "index": 0, "status": "inserted", "id": "..." },
    { "index": 1, "status": "duplicated", "id": "..." },
    { "index": 2, "status": "failed", "error": "..." }
  ],
  "summary": { "total": 3, "inserted": 1, "duplicated": 1, "failed": 1 }
}
```
