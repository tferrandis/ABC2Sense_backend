## ADDED Requirements

### Requirement: Sensor schema fields
The `SensorDefinition` model SHALL have the following fields:
- `sensorId` (Number, required, unique) - Numeric identifier for device communication
- `key` (String, required, unique, uppercase) - Human-readable identifier (e.g. "PH", "TEMP")
- `name` (String, required) - Display name (e.g. "Temperature Sensor")
- `unit` (String, required) - Unit of measurement (e.g. "°C", "pH", "%")
- `description` (String, optional) - Detailed description of the sensor
- `origin` (String, required, enum) - Source type: `device`, `backend`, or `manual`
- `enabled` (Boolean, required, default: true) - Whether the sensor is active
- `created_at` (Date, auto) - Creation timestamp
- `updated_at` (Date, auto) - Last update timestamp

#### Scenario: Valid sensor creation
- **WHEN** a sensor is created with all required fields (sensorId: 1, key: "TEMP", name: "Temperature", unit: "°C", origin: "device")
- **THEN** the sensor is persisted with `enabled: true` and auto-generated timestamps

#### Scenario: Sensor with optional description
- **WHEN** a sensor is created without `description`
- **THEN** the sensor is persisted with `description` as null/undefined

### Requirement: sensorId uniqueness
The system SHALL enforce uniqueness on the `sensorId` field. No two sensors can share the same numeric ID.

#### Scenario: Duplicate sensorId rejected
- **WHEN** a sensor is created with a `sensorId` that already exists
- **THEN** the system SHALL return an error indicating duplicate sensorId

### Requirement: key uniqueness and format
The system SHALL enforce uniqueness on the `key` field. Keys MUST be uppercase alphanumeric strings.

#### Scenario: Duplicate key rejected
- **WHEN** a sensor is created with a `key` that already exists
- **THEN** the system SHALL return an error indicating duplicate key

#### Scenario: Key stored as uppercase
- **WHEN** a sensor is created with key "temp"
- **THEN** the key SHALL be stored as "TEMP"

### Requirement: origin enum validation
The `origin` field SHALL only accept values: `device`, `backend`, `manual`.

#### Scenario: Invalid origin rejected
- **WHEN** a sensor is created with origin "external"
- **THEN** the system SHALL return a validation error

#### Scenario: Valid origin accepted
- **WHEN** a sensor is created with origin "device"
- **THEN** the sensor is persisted successfully

### Requirement: enabled field defaults to true
The `enabled` field SHALL default to `true` when not specified.

#### Scenario: Default enabled value
- **WHEN** a sensor is created without specifying `enabled`
- **THEN** the sensor SHALL have `enabled: true`

#### Scenario: Explicitly disabled sensor
- **WHEN** a sensor is created with `enabled: false`
- **THEN** the sensor SHALL have `enabled: false`

### Requirement: Compatibility with measurements
The `sensorId` field MUST be compatible with the `measurements[].sensor_id` field in the Measurement model. Sensors are referenced by their numeric `sensorId` in measurements.

#### Scenario: Measurement references sensor by numeric id
- **WHEN** a measurement contains `sensor_id: 1` in its measurements array
- **THEN** this SHALL correspond to the sensor with `sensorId: 1` in SensorDefinition

### Requirement: Updated controller endpoints
The existing endpoints SHALL be updated to work with the new schema:
- `POST /api/sensor/definitions` - Accept new fields (sensorId, key, name, unit, description, origin, enabled)
- `GET /api/sensor/definitions` - Return all sensors with new fields

#### Scenario: Create sensor with new schema
- **WHEN** POST /api/sensor/definitions with body `{ sensorId: 1, key: "TEMP", name: "Temperature", unit: "°C", origin: "device" }`
- **THEN** the system SHALL return 201 with the created sensor including all fields

#### Scenario: List sensors returns new fields
- **WHEN** GET /api/sensor/definitions
- **THEN** each sensor in the response SHALL include sensorId, key, name, unit, description, origin, enabled, created_at, updated_at
