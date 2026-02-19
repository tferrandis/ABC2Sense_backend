# Tasks: BE-01 Auth & Session Core

- [x] Create RefreshToken model (src/models/refreshToken.js)
- [x] Add auth rate limiters to rateLimiter.js (loginLimiter, refreshLimiter)
- [x] Update authController.login to return accessToken + refreshToken with hash storage
- [x] Update authController.register to store refreshToken hash
- [x] Implement authController.refresh (token rotation)
- [x] Implement authController.logout (token revocation)
- [x] Implement authController.me (current user profile)
- [x] Update authRoutes.js with new endpoints
- [x] Add refresh validator to authValidators.js
