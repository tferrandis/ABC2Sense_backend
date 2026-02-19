# Proposal: Forgot/Reset Password Flow

## Problem
The current `forgotPassword` function is incomplete (uses an in-memory map, hardcoded reset URL). There is no `resetPassword` endpoint. Tokens are not hashed or stored in DB.

## Goal
Implement a secure password recovery flow with:
- `POST /api/auth/forgot-password` — generates a one-time hashed token (15min TTL), sends reset email
- `POST /api/auth/reset-password` — validates token, updates password, invalidates all active sessions

## Scope
- New `PasswordResetToken` model with hashed storage, TTL, single-use tracking
- Update `forgotPassword` to use DB-backed tokens
- New `resetPassword` endpoint
- On successful reset, revoke all refresh tokens for the user
- Rate limiting on forgot-password to prevent abuse

## Out of Scope
- Frontend reset page (backend only provides API)
- Email template design (basic HTML)
