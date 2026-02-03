## 1. Model Updates

- [x] 1.1 Add emailVerified field to User model with default false

## 2. Controller Updates

- [x] 2.1 Check for existing user with same email before registration
- [x] 2.2 Check for existing user with same username before registration
- [x] 2.3 Generate access token (8h expiration) after successful user creation
- [x] 2.4 Generate refresh token (7d expiration) after successful user creation
- [x] 2.5 Update register response to return user, accessToken, refreshToken, and expiresAt

## 3. Documentation

- [x] 3.1 Update apiDoc comments in authController.js to reflect new response format

## 4. Testing

- [x] 4.1 Test successful registration returns tokens
- [x] 4.2 Test duplicate email returns 400 error
- [x] 4.3 Test duplicate username returns 400 error
- [x] 4.4 Test new user has emailVerified false
