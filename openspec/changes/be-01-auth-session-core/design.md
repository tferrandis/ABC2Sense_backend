# Design: Auth & Session Core

## Architecture

### Refresh Token Flow
1. On login/register, server generates an accessToken (JWT, 15min) and a refreshToken (opaque random string, 7d).
2. The refresh token is hashed (SHA-256) before storage in `RefreshToken` collection.
3. On refresh, the server validates the raw token against stored hash, issues new pair, and revokes the old token.
4. On logout, the refresh token is revoked.

### Data Model

**RefreshToken collection:**
| Field      | Type     | Notes                            |
|------------|----------|----------------------------------|
| userId     | ObjectId | ref: User                        |
| tokenHash  | String   | SHA-256 hash, unique index       |
| expiresAt  | Date     | TTL index for auto-cleanup       |
| revoked    | Boolean  | default false                    |
| createdAt  | Date     | default Date.now                 |

### Endpoints

| Method | Path              | Auth     | Description                    |
|--------|-------------------|----------|--------------------------------|
| POST   | /api/auth/login   | Public   | Returns accessToken + refreshToken |
| POST   | /api/auth/refresh | Public   | Rotate refresh token           |
| POST   | /api/auth/logout  | JWT      | Revoke refresh token           |
| GET    | /api/auth/me      | JWT      | Return current user profile    |

### Security
- Access token: 15 minutes expiry (short-lived)
- Refresh token: 7 days expiry, stored as hash
- Login rate limiter: 10 attempts per 15 minutes per IP
- Refresh rate limiter: 30 attempts per 15 minutes per IP
- Old refresh tokens are revoked on rotation (prevents replay)

### Changes to Existing Code
- `authController.login` — add refreshToken generation + storage
- `authController.register` — store refreshToken hash (already returns refresh token but doesn't persist)
- `authRoutes.js` — add refresh, logout, me routes
- `rateLimiter.js` — add auth-specific limiters
- New file: `src/models/refreshToken.js`
