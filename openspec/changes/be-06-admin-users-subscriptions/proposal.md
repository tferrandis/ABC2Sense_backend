# Proposal: BE-06 Admin API Users + Subscriptions

## Summary
Implement admin-focused user management improvements:
- User listing with pagination and filters
- User account status updates (active/suspended)
- User subscription updates (plan/status/dates/auto-renew)

## Scope
- Extend `User` schema with account and subscription state
- Add admin endpoints for account/subscription management
- Keep backwards compatibility with existing user/auth flows

## Out of scope
- Billing provider integration
- Admin web UI changes
