# Tasks: BE-03 Measurements Ingestion

- [x] Update Measurement model with new fields + unique compound index
- [x] Update createMeasurement controller with idempotency + new fields
- [x] Create createBulkMeasurements controller (rename batch → bulk, add idempotency)
- [x] Add /bulk route (keep /batch as backward-compat alias)
- [x] Update validators for new fields
