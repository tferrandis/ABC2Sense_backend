## ADDED Requirements

### Requirement: Bulk delete endpoint
The system SHALL provide a `DELETE /api/measurements` endpoint that deletes measurements matching the provided filters.

#### Scenario: Delete with date range filter
- **WHEN** DELETE /api/measurements?from=2024-01-01&to=2024-01-31 with header X-Confirm: true
- **THEN** all measurements within that date range for the authenticated user SHALL be deleted and the response SHALL include `{ deleted: N }`

#### Scenario: Delete with sensor filter
- **WHEN** DELETE /api/measurements?sensorId=1 with header X-Confirm: true
- **THEN** all measurements containing sensor_id 1 for the authenticated user SHALL be deleted

### Requirement: Same filters as GET
The DELETE endpoint SHALL support the same query parameters as GET /api/measurements: `from`, `to`, `lat`, `lng`, `radius`, `radius_m`, `sensorId`, `userId` (admin only).

#### Scenario: Combined filters
- **WHEN** DELETE /api/measurements?from=2024-01-01&sensorId=1 with header X-Confirm: true
- **THEN** only measurements matching BOTH filters SHALL be deleted

### Requirement: Confirmation header required
The endpoint SHALL require the header `X-Confirm: true` to proceed with deletion. Requests without this header SHALL be rejected.

#### Scenario: Missing confirmation header
- **WHEN** DELETE /api/measurements?from=2024-01-01 without X-Confirm header
- **THEN** the system SHALL return 400 with message indicating confirmation is required

#### Scenario: Confirmation header present
- **WHEN** DELETE /api/measurements?from=2024-01-01 with header X-Confirm: true
- **THEN** the deletion SHALL proceed

### Requirement: At least one filter required
The endpoint SHALL require at least one filter parameter. Requests without any filters SHALL be rejected to prevent accidental deletion of all data.

#### Scenario: No filters provided
- **WHEN** DELETE /api/measurements with header X-Confirm: true but no query params
- **THEN** the system SHALL return 400 with message indicating at least one filter is required

### Requirement: Admin userId filter
Admin users SHALL be able to specify `userId` to delete measurements of another user. Regular users SHALL only delete their own measurements.

#### Scenario: Admin deletes another user's measurements
- **WHEN** an admin sends DELETE /api/measurements?userId=OTHER_USER_ID&from=2024-01-01 with X-Confirm: true
- **THEN** measurements of OTHER_USER_ID matching the filters SHALL be deleted

#### Scenario: Regular user ignores userId
- **WHEN** a regular user sends DELETE /api/measurements?userId=OTHER_USER_ID with X-Confirm: true
- **THEN** only the authenticated user's measurements SHALL be deleted (userId is ignored)

### Requirement: Response format
The response SHALL include the count of deleted measurements.

#### Scenario: Successful deletion response
- **WHEN** a bulk delete completes successfully
- **THEN** the response SHALL be 200 with body `{ deleted: N }` where N is the number of deleted measurements

#### Scenario: No measurements match
- **WHEN** filters match zero measurements
- **THEN** the response SHALL be 200 with body `{ deleted: 0 }`
