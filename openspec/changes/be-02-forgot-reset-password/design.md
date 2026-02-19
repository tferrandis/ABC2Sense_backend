# Design: Forgot/Reset Password Flow

## Architecture

### Token Flow
1. User requests forgot-password with their email
2. Server generates a random token, stores SHA-256 hash in `PasswordResetToken` collection
3. Raw token is sent via email as part of a reset URL/code
4. User submits reset-password with token + new password
5. Server validates: hash match, not expired, not used
6. Password is updated, token marked as used, all refresh tokens revoked

### Data Model

**PasswordResetToken collection:**
| Field     | Type     | Notes                          |
|-----------|----------|--------------------------------|
| userId    | ObjectId | ref: User                      |
| tokenHash | String   | SHA-256 hash, unique           |
| expiresAt | Date     | TTL index, 15min from creation |
| usedAt    | Date     | null until used                |
| createdAt | Date     | default Date.now               |

### Endpoints

| Method | Path                        | Auth   | Description              |
|--------|-----------------------------|--------|--------------------------|
| POST   | /api/auth/forgot-password   | Public | Issue reset token + email|
| POST   | /api/auth/reset-password    | Public | Validate token, update pw|

### Security
- Forgot-password rate limit: 5 req / 15min per IP
- Token TTL: 15 minutes
- Single use: `usedAt` set on successful reset
- On reset: all refresh tokens for user are revoked (force re-login)
- Response is always 200 even if email not found (prevent enumeration)
