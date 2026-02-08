## ADDED Requirements

### Requirement: Filter by sensorId
The system SHALL allow filtering measurements by sensor_id.

#### Scenario: Filter by specific sensor
- **WHEN** user sends GET /measurements?sensorId=1
- **THEN** only measurements containing sensor_id=1 are returned

### Requirement: Admin can filter by userId
The system SHALL allow admin users to filter measurements by userId.

#### Scenario: Admin filters by userId
- **WHEN** admin sends GET /measurements?userId=xyz
- **THEN** measurements for user xyz are returned

#### Scenario: Non-admin userId ignored
- **WHEN** non-admin sends GET /measurements?userId=xyz
- **THEN** the userId param is ignored and only their own measurements returned

### Requirement: Support radius in meters
The system SHALL accept radius_m parameter for radius filtering in meters.

#### Scenario: Filter by radius in meters
- **WHEN** user sends GET /measurements?lat=40&lng=-74&radius_m=5000
- **THEN** measurements within 5km radius are returned
