## ADDED Requirements

### Requirement: User registration returns authentication tokens
The system SHALL return access and refresh tokens upon successful user registration, allowing immediate authenticated access without requiring a separate login call.

#### Scenario: Successful registration with valid data
- **WHEN** a user submits POST /api/auth/register with valid username, email, and password
- **THEN** the system creates the user with role "user" and emailVerified false
- **AND** returns HTTP 201 with user object, accessToken, refreshToken, and expiresAt

#### Scenario: Registration with duplicate email
- **WHEN** a user submits POST /api/auth/register with an email that already exists
- **THEN** the system returns HTTP 400 with error message indicating email is taken

#### Scenario: Registration with duplicate username
- **WHEN** a user submits POST /api/auth/register with a username that already exists
- **THEN** the system returns HTTP 400 with error message indicating username is taken

### Requirement: Password validation on registration
The system SHALL enforce password strength requirements: minimum 8 characters, at least one uppercase letter, and at least one special character.

#### Scenario: Password too short
- **WHEN** a user submits registration with password less than 8 characters
- **THEN** the system returns HTTP 400 with validation error

#### Scenario: Password missing uppercase
- **WHEN** a user submits registration with password without uppercase letters
- **THEN** the system returns HTTP 400 with validation error

#### Scenario: Password missing special character
- **WHEN** a user submits registration with password without special characters
- **THEN** the system returns HTTP 400 with validation error

### Requirement: Email validation on registration
The system SHALL validate that the email address has a valid format.

#### Scenario: Invalid email format
- **WHEN** a user submits registration with invalid email format
- **THEN** the system returns HTTP 400 with validation error

### Requirement: User model includes emailVerified flag
The system SHALL store an emailVerified boolean field for each user, defaulting to false on registration.

#### Scenario: New user has emailVerified false
- **WHEN** a new user is created via registration
- **THEN** the user record has emailVerified set to false

### Requirement: Access token expiration
The system SHALL generate access tokens with 8 hour expiration, consistent with login behavior.

#### Scenario: Access token includes expiration
- **WHEN** registration is successful
- **THEN** the response includes expiresAt timestamp 8 hours from creation time

### Requirement: Refresh token generation
The system SHALL generate a refresh token with 7 day expiration for session renewal.

#### Scenario: Refresh token returned on registration
- **WHEN** registration is successful
- **THEN** the response includes a refreshToken that can be used to obtain new access tokens
