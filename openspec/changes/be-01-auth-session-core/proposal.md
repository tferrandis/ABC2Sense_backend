# Proposal: Auth & Session Core

## Problem
The current auth layer only supports login and register with a single JWT access token. There is no refresh token rotation, no logout/revocation mechanism, no `/me` endpoint, and no brute-force protection on login.

## Goal
Implement a production-ready auth/session layer with:
- Login returning accessToken + refreshToken
- Refresh token rotation with hash-based storage and revocation
- Logout that revokes the current session
- `/me` endpoint for the authenticated user
- Rate limiting on login to prevent brute-force attacks

## Scope
- `POST /api/auth/login` — updated to return accessToken + refreshToken
- `POST /api/auth/refresh` — rotate refresh token, invalidate old one
- `POST /api/auth/logout` — revoke refresh token
- `GET /api/auth/me` — return current user profile
- New `RefreshToken` model with hashed token storage and TTL index
- Auth-specific rate limiters (login anti-brute-force)

## Out of Scope
- Email verification flow (already exists as field, separate card)
- Forgot/reset password (separate card BE-02)
- Admin-specific endpoints beyond role enforcement
