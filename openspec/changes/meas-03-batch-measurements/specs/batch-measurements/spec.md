## ADDED Requirements

### Requirement: Batch endpoint accepts array of measurements
The system SHALL provide POST /measurements/batch that accepts an array of measurement objects.

#### Scenario: Successful batch insert
- **WHEN** user sends POST /measurements/batch with valid array of measurements
- **THEN** the system saves all measurements and returns results array

### Requirement: Batch limit of 20 items
The system SHALL reject requests with more than 20 measurements.

#### Scenario: Batch exceeds limit
- **WHEN** user sends batch with more than 20 measurements
- **THEN** the system returns 400 with error message

### Requirement: Individual results per measurement
The system SHALL return success/error status for each measurement in the batch.

#### Scenario: Mixed results in batch
- **WHEN** batch contains some valid and some invalid measurements
- **THEN** valid measurements are saved and response shows success for those
- **AND** invalid measurements show error with reason

### Requirement: Batch response format
The system SHALL return array with index, success boolean, and id or error for each item.

#### Scenario: Response format
- **WHEN** batch is processed
- **THEN** response contains results array with {index, success, id?, error?} for each item
