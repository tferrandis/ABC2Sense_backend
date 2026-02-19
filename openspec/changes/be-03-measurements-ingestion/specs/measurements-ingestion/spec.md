# Spec: Measurements Ingestion

## Model: Measurement (updated)
New fields added to existing schema:
- `client_measurement_id`: String, optional, sparse unique compound with user_id
- `timestamp_device_ms`: Number, optional (device-side ms timestamp)
- `source`: String, optional (e.g. 'manual', 'ble', 'scheduled')
- `location_used`: Boolean, default false
- `capture_with_gps`: Boolean, default false
- `notebook_id`: String, optional

New index: `{ user_id: 1, client_measurement_id: 1 }` unique sparse

## POST /api/measurements (single)
Input body (new fields in addition to existing):
- `client_measurement_id`: String (optional, for idempotency)
- `timestamp_device_ms`: Number (optional)
- `source`: String (optional)
- `location_used`: Boolean (optional)
- `capture_with_gps`: Boolean (optional)
- `notebook_id`: String (optional)

Behavior:
- If `client_measurement_id` is provided, check for existing `(user_id, client_measurement_id)` match
- If duplicate found: return 200 `{ status: "duplicated", measurement: existingDoc }`
- If new: save and return 201 `{ status: "inserted", measurement: newDoc }`
- If no `client_measurement_id`: always insert (no idempotency check)

## POST /api/measurements/bulk (new, also aliased as /batch)
Input: `{ measurements: [...] }` (max 50 items)
Each item same schema as single endpoint including client_measurement_id

Per-item processing:
- If `client_measurement_id` exists and duplicate found → `{ index, status: "duplicated", id }`
- If inserted successfully → `{ index, status: "inserted", id }`
- If validation/save error → `{ index, status: "failed", error }`

Response:
```json
{
  "results": [...],
  "summary": { "total": N, "inserted": N, "duplicated": N, "failed": N }
}
```
Status code: 201
