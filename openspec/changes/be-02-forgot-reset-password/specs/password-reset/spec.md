# Spec: Password Reset Flow

## PasswordResetToken Model
- Fields: userId (ObjectId, ref User), tokenHash (String, unique), expiresAt (Date), usedAt (Date, default null), createdAt (Date)
- Indexes: userId, expiresAt (TTL auto-delete after 1h buffer)
- Static method `hashToken(raw)` → SHA-256 hex digest

## POST /api/auth/forgot-password
- Input: { email }
- Rate limit: 5 req / 15 min per IP
- Lookup user by email. If not found, return 200 anyway (anti-enumeration)
- If found: generate crypto.randomBytes(32).toString('hex'), store hash, send email with token
- Invalidate any previous unused tokens for the same user
- Return: { message: 'If the email exists, a reset link has been sent' }

## POST /api/auth/reset-password
- Input: { token, password }
- Validate password with same rules as register (min 8 chars, 1 uppercase, 1 special char)
- Hash the token, find matching record: not expired, usedAt is null
- If invalid: 400 'Invalid or expired reset token'
- If valid:
  1. Update user password
  2. Set usedAt = new Date()
  3. Revoke all refresh tokens for this user (force re-login on all devices)
- Return: { message: 'Password reset successfully' }
