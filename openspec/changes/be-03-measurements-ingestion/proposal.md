# Proposal: Measurements Ingestion (Single + Bulk)

## Problem
The current measurement model and endpoints lack fields required by the offline-first mobile client (timestamp_device_ms, source, location_used, capture_with_gps, notebook_id, client_measurement_id). There is no idempotency mechanism, so duplicate retries create extra rows. Bulk results don't distinguish between inserted and duplicated items.

## Goal
Extend the measurement model and ingestion endpoints for resilient offline-first sync:
- Add all missing payload fields
- Idempotency via unique constraint on `(user_id, client_measurement_id)`
- Per-item bulk results with `inserted|duplicated|failed` status

## Scope
- Update Measurement model with new fields + unique compound index
- Update POST /api/measurements (single) with idempotency + new fields
- Rename POST /api/measurements/batch → /api/measurements/bulk with idempotency + new results format
- Keep backward compatibility (new fields optional)

## Out of Scope
- Query/filter endpoints (separate card BE-04)
- Notebook CRUD (separate card BE-08)
