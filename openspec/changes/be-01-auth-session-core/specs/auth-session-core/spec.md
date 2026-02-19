# Spec: Auth & Session Core

## RefreshToken Model
- Fields: userId (ObjectId, ref User), tokenHash (String, unique), expiresAt (Date), revoked (Boolean, default false), createdAt (Date)
- Indexes: userId, expiresAt (TTL auto-delete)
- Static method `hashToken(raw)` → SHA-256 hex digest

## POST /api/auth/login
- Input: identifier (email or username), password
- Rate limit: 10 req / 15 min per IP
- On success:
  - Generate accessToken JWT (15min, payload: { id: user._id })
  - Generate refreshToken: crypto.randomBytes(40).toString('hex')
  - Store hash of refreshToken in RefreshToken collection
  - Return: { user, accessToken, refreshToken, expiresAt }
- On failure: 400 with error message

## POST /api/auth/register (update)
- After creating user, also store refreshToken hash in RefreshToken collection
- Return same shape as login: { user, accessToken, refreshToken, expiresAt }
- Access token 15min, refresh token 7d

## POST /api/auth/refresh
- Input: { refreshToken } in request body
- Rate limit: 30 req / 15 min per IP
- Validate: hash the provided token, find matching non-revoked, non-expired record
- If valid: revoke old token, generate new accessToken + refreshToken pair, store new hash
- If invalid: return 401
- Return: { accessToken, refreshToken, expiresAt }

## POST /api/auth/logout
- Requires JWT authentication
- Input: { refreshToken } in request body
- Hash the token, find record belonging to req.user._id
- If found: set revoked = true
- Return: { message: 'Logged out successfully' }

## GET /api/auth/me
- Requires JWT authentication
- Return current user profile (without password)
- Fields: _id, username, email, role, emailVerified, registrationDate
