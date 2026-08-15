---
name: abc2-backend
description: Architecture and integration map for the ABC2Sense backend (Node/Express/MongoDB). Use when working anywhere in this repo, or when changing anything that crosses the boundary to the Flutter app (abc2s_app) or the ESP32-S3 firmware (abc2s_micro) — API contracts, auth, measurement ingestion, OTA catalog, or the Gemini AI module.
---

# ABC2Sense backend

Node 18+ / Express 4 / MongoDB (Atlas) via Mongoose. Entry point `src/server.js`.
Deployed on a VPS behind nginx (`nginx.conf.example`), managed by systemd
(`sensor_backend.service`), listening on `PORT` (default 5000).

## Where this sits in the system

Three repositories form one product:

```
  ESP32-S3 board                Flutter app                   this repo
  (abc2s_micro)                 (abc2s_app)                   (ABC2Sense_backend)
  ┌──────────────┐   BLE GATT   ┌──────────────┐   HTTP/JSON  ┌──────────────┐
  │ sensors, log │◄────────────►│ scan/connect │◄────────────►│ Express API  │
  │ storage, OTA │  FFE0 svc    │ offline store│   JWT auth   │ MongoDB      │
  └──────────────┘              └──────────────┘              └──────┬───────┘
         ▲                                                           │
         └───────────── firmware .bin over BLE ──────────────────────┘
                    (app downloads from /api/firmware, flashes over FFE3)
```

**The board never talks to this backend.** It has no WiFi role in this product:
every byte it produces reaches the server by way of the phone. That means two
things worth remembering when changing anything here:

1. Measurement data arrives **late and in batches**, replayed from the app's
   offline store, not in real time. `timestamp` is when the reading was taken,
   not when it was received. `client_measurement_id` is the app-generated
   idempotency key — the unique sparse index on `(user_id, client_measurement_id)`
   is what makes replay safe.
2. Firmware images flow **out** through this API and into the board through the
   phone. `GET /api/firmware/catalog`, `/latest` and `/download/:id` are
   deliberately unauthenticated so the app can fetch an image before the user
   is necessarily logged in; everything else under `/api/firmware` needs admin.

## Route map

Mounted explicitly in `src/server.js`. **Mount order is load-bearing** —
`adminRoutes` must stay ahead of `authRoutes` on `/api/auth`. See
`docs/NOTES-known-issues.md` §3 before moving anything.

| Prefix | Router | Auth | Consumer |
|---|---|---|---|
| `/api/auth` | `adminRoutes` | `adminAuth` (except `POST /`) | admin web shell |
| `/api/auth` | `authRoutes` | mixed | **Flutter app** |
| `/api/admin-web` | `adminWebRoutes` | `adminAuth` | admin web shell |
| `/api/firmware` | `firmwareRoutes` | public reads, admin writes | **app** (OTA) |
| `/api/v1/admin/sensors`, `/api/admin/sensors` | `adminSensorRoutes` | `adminAuth` | admin web shell |
| `/api/ai` | `aiRoutes` | JWT (except `/status`) | **app** |
| `/api/measurements` | `measurements.js` | JWT | **app** |
| `/api/notebooks` | `notebooksRoutes` | JWT | **app** |
| `/api/sensor` | `sensorRoutes` | JWT | — |
| `/api/system` | `systemRoutes` | public | monitoring |
| `/api/user` | `userRoutes` | JWT | app |
| `/admin` | static | — | admin web shell |
| `/api/docs` | static | — | apidoc output |

Adding a router means adding an `app.use` line. There is no auto-loader any
more — the old `fs.readdirSync` loop silently double-mounted `/api/firmware`
and `/api/auth` and exposed `adminSensorRoutes` at a third, unintended
`/api/adminsensor`.

## Auth model

Two independent schemes that both read `JWT_SECRET`:

- **Users** (the app): `passport-local` on login → `generateTokenPair` issues an
  access token plus a refresh token persisted in `refreshToken`/`token` models.
  Protected routes use `passport.authenticate('jwt', { session: false })`.
- **Admins** (the web shell): `src/middlewares/adminAuth.js` verifies the token
  directly with `jwt.verify` and checks the `admin` model. 24 h expiry.

Rate limiting lives in `src/middlewares/rateLimiter.js`. Two things there are
easy to break:

- `keyGenerator` must call `ipKeyGenerator(req.ip)` — passing `req` returns the
  request object, which becomes a fresh `Map` key on every call, so the counter
  never accumulates and the limiter silently never fires.
- `app.set('trust proxy', 1)` in `server.js` is required because nginx
  terminates the connection. Without it `req.ip` is `127.0.0.1` for everyone
  and all clients share one bucket.

## Data model

`src/models/`. The ones that cross repo boundaries:

- **`measurement`** — one document per capture event, holding an array of
  `{ sensor_id, value }`. `sensor_id` is `Mixed` because the firmware reports
  numeric sensor IDs while some paths pass strings. `notebook_id` is a plain
  `String`, not an ObjectId ref.
- **`notebook`** / **`preset`** — field notebooks and their sensor range
  presets. The app owns the UX; shapes are asserted in `notebooksController`.
- **`firmware`** / **`otaEvent`** — OTA catalog and telemetry for flashes the
  app performs over BLE.
- **`sensorDefinition`** — sensor catalog. Note the app's
  `sensorCatalogEndpoint` constant points at `/sensors/catalog`, which does not
  exist here; `sensorRoutes` only exposes `/definitions` under `/api/sensor`.

## AI module

`src/controllers/aiController.js` + `src/services/ai/`. Google Gemini via REST.

- Gated by `AI_ENABLED`; `GET /api/ai/status` reports `available` and the app
  hides its AI entry points when false.
- `GEMINI_API_KEY`, `GEMINI_MODEL_FAST`, `GEMINI_MODEL_REASON`, `GEMINI_API_BASE`.
- Every call is recorded as an `aiRun`; outputs land in `aiInsight`,
  `aiRecommendation`, `aiPresetSuggestion`, feedback in `aiFeedback`.
- `POST /api/ai/report-from-data` exists specifically because the app holds
  measurements locally before syncing — it accepts a measurement object inline
  rather than an id.
- **Latency matters across the boundary.** Gemini calls take up to 60 s. The app
  overrides its 3 s default with a 60 s receive timeout for AI endpoints only
  (`_aiOptions()` in `backend_provider.dart`). Raising the server-side budget
  without raising it there produces client timeouts that look like server errors.
- Preset suggestions are returned as `{ runId, presetSuggestions }`. The
  controller normalises both `suggestions` and `presetSuggestions` from the
  model's JSON; the app reads `presetSuggestions`.

## Conventions

- CommonJS (`require`), not ESM.
- Validators in `src/validators/` using `express-validator`, applied as route
  middleware followed by `validateResult`.
- apidoc comment blocks above controller handlers; `npm run apidoc` regenerates
  `docs/`.
- Middleware lives in `src/middlewares/` (plural). The singular `src/middleware/`
  directory was merged away — do not recreate it.
- OpenSpec specs in `openspec/specs/`.

## Before you change an API shape

Field names are duplicated by hand in Dart (`lib/core/constants/api_constants.dart`,
`lib/providers/backend_provider.dart`) and here. There is no generated client and
no contract test, so a rename that looks local is a silent break at runtime. The
bulk-measurement endpoint has been broken this way since it was written — see
`docs/NOTES-known-issues.md` §2. Grep the app repo before renaming a JSON key.
