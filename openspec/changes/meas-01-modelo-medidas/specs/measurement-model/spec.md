## ADDED Requirements

### Requirement: Measurement model includes device_id
The system SHALL accept an optional `device_id` string field to identify the IoT device.

#### Scenario: Create measurement with device_id
- **WHEN** user creates measurement with device_id field
- **THEN** the measurement is saved with the device_id value

#### Scenario: Create measurement without device_id
- **WHEN** user creates measurement without device_id
- **THEN** the measurement is saved with device_id as null/undefined

### Requirement: Measurement model includes notes
The system SHALL accept an optional `notes` string field for user comments.

#### Scenario: Create measurement with notes
- **WHEN** user creates measurement with notes field
- **THEN** the measurement is saved with the notes value

### Requirement: Admin can specify user_id
The system SHALL allow admin users to specify a different user_id when creating measurements.

#### Scenario: Admin creates measurement for another user
- **WHEN** admin sends POST /measurements with user_id in body
- **THEN** the measurement is created with the specified user_id

#### Scenario: Regular user cannot override user_id
- **WHEN** non-admin user sends POST /measurements with user_id in body
- **THEN** the system ignores the body user_id and uses the authenticated user's ID

### Requirement: Measurement values must be numeric
The system SHALL validate that all values in the measurements array are numeric.

#### Scenario: Valid numeric values
- **WHEN** user creates measurement with numeric values
- **THEN** the measurement is saved successfully

#### Scenario: Invalid non-numeric value
- **WHEN** user creates measurement with non-numeric value
- **THEN** the system returns 400 with validation error

### Requirement: Location accepts null coordinates
The system SHALL accept null values for lat and lon coordinates.

#### Scenario: Create measurement with null location
- **WHEN** user creates measurement with lat: null and lon: null
- **THEN** the measurement is saved with null coordinates

### Requirement: Timestamp defaults to server time
The system SHALL use server time if timestamp is not provided.

#### Scenario: Create measurement without timestamp
- **WHEN** user creates measurement without timestamp field
- **THEN** the measurement is saved with current server time
