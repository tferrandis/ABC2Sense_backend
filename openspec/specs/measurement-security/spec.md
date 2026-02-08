## ADDED Requirements

### Requirement: Rate limiting on POST measurements
The system SHALL enforce rate limiting on `POST /api/measurements` with a default of 100 requests per minute per user.

#### Scenario: Under rate limit
- **WHEN** a user sends less than 100 POST requests per minute
- **THEN** all requests SHALL succeed normally

#### Scenario: Rate limit exceeded
- **WHEN** a user exceeds 100 POST requests per minute
- **THEN** the system SHALL return 429 Too Many Requests with a Retry-After header

### Requirement: Rate limiting on batch POST
The system SHALL enforce rate limiting on `POST /api/measurements/batch` with a default of 10 requests per minute per user.

#### Scenario: Batch rate limit exceeded
- **WHEN** a user exceeds 10 batch POST requests per minute
- **THEN** the system SHALL return 429 Too Many Requests

### Requirement: Rate limiting on bulk DELETE
The system SHALL enforce rate limiting on `DELETE /api/measurements` (bulk) with a default of 5 requests per minute per user.

#### Scenario: Bulk delete rate limit exceeded
- **WHEN** a user exceeds 5 bulk DELETE requests per minute
- **THEN** the system SHALL return 429 Too Many Requests

### Requirement: Rate limit configurable via environment
Rate limits SHALL be configurable via environment variables: `RATE_LIMIT_MEASUREMENTS_POST`, `RATE_LIMIT_MEASUREMENTS_BATCH`, `RATE_LIMIT_MEASUREMENTS_DELETE`.

#### Scenario: Custom rate limit
- **WHEN** `RATE_LIMIT_MEASUREMENTS_POST=200` is set
- **THEN** the POST rate limit SHALL be 200 requests per minute

### Requirement: Database indexes
The Measurement model SHALL have optimized indexes for common query patterns.

#### Scenario: Index on user_id + timestamp
- **WHEN** a query filters by `user_id` and sorts by `timestamp`
- **THEN** MongoDB SHALL use the compound index `{ user_id: 1, timestamp: -1 }`

#### Scenario: Index on sensor_id
- **WHEN** a query filters by `measurements.sensor_id`
- **THEN** MongoDB SHALL use the index on `measurements.sensor_id`
