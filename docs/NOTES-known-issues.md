# Known issues — deliberately NOT fixed in code

These two items were reviewed and left as notes on purpose: they need an
operational decision or a coordinated release across repos, not a patch here.

---

## 1. Committed secrets — treat `.env` as compromised

**Status:** open. Requires credential rotation by a human. No code change can undo this.

`.env` is tracked in git and has been since the very first commit
(`764a7c3`, 2025-03-21). It is listed in `.gitignore`, but it was added to the
index *before* the ignore rule existed, so git keeps tracking it.

This repository is **public**. Every value below has been readable by anyone
for over a year, and is reachable in the history even after the file is removed:

| Variable | What leaked |
|---|---|
| `MONGO_URI` | MongoDB Atlas SRV connection string, including user and password |
| `EMAIL_PASS` | Gmail app-password for `cataboSense@gmail.com` |
| `JWT_SECRET` | Signing key for every access token (also weak: `my_super_secre…`) |
| `EMAIL_USER`, `EMAIL_FROM` | Sender identity |

### What to do, in order

1. **Rotate first, clean up second.** Cleaning history without rotating
   achieves nothing — assume the values are already harvested.
   - Atlas: change the database user's password (or delete and recreate the
     user). While you are there, restrict the IP access list — a leaked URI is
     only exploitable from an allowed source address.
   - Gmail: revoke the app-password at <https://myaccount.google.com/apppasswords>
     and issue a new one.
   - `JWT_SECRET`: generate a strong value, e.g. `openssl rand -base64 48`.
     Rotating it invalidates every issued access token, so users will have to
     log in again. Refresh tokens are stored server-side and are unaffected.
2. **Stop tracking the file:** `git rm --cached .env && git commit`.
   `.gitignore` already covers it, so it will stay out from then on.
3. **Purge the history** with `git filter-repo --path .env --invert-paths`,
   then force-push and ask every collaborator to re-clone. This is cosmetic
   relative to step 1 — do it, but do not let it delay the rotation.
4. **Consider whether the repo needs to be public at all.** The other two
   repositories in the system (`abc2s_micro`, `abc2s_app`) are private.

### Preventing a repeat

Add a pre-commit secret scanner (`gitleaks`, `trufflehog`) and keep the
deployment values in the VPS environment or a secrets manager, never in the
repo. `.env.example` with empty placeholders is the right thing to commit.

---

## 2. `POST /api/measurements/bulk` — request and response shapes do not match the app

**Status:** open. Needs a coordinated fix across backend and app.

The endpoint has never worked from the mobile app. Two independent mismatches:

**Request body.** The app sends:

```json
{ "records": [ ... ] }
```

`createBulkMeasurements` (`src/controllers/measurementsController.js`) reads:

```js
const { measurements } = req.body;
if (!measurements || !Array.isArray(measurements)) {
  return res.status(400).json({ error: 'measurements must be an array' });
}
```

so every call returns **400** before touching the database.

**Response body.** Even once the request is accepted, the app reads
`response.data['measurements']`, while the controller returns
`{ results, summary }`. The app would silently receive an empty list.

**Batch size.** The controller caps a request at `BATCH_LIMIT = 50`. The app
(`programming_screen.dart`, device log download) sends the whole set in one
call and does not chunk, so any device with more than 50 stored records fails
even after the key names are aligned.

### Why this is not patched here

Fixing only one side breaks the other the moment one of the two is deployed
without the other. The firmware log download is the only caller, so there is no
partial-rollout path that stays working. Decide the contract first, then ship
both sides together.

Recommended shape — accept both keys server-side for one release so the fix can
be deployed backend-first:

```js
const measurements = req.body.measurements ?? req.body.records;
```

…and return `{ results, summary, measurements }` where `measurements` holds the
inserted documents. Then update the app to chunk at 50 and to read `results`.

### Related: two overlapping bulk endpoints

`measurements.js` exposes both `POST /bulk` (`createBulkMeasurements`) and
`POST /batch` (`createBatchMeasurements`). Nothing in the app calls `/batch`.
Whichever contract you settle on, collapse these into one endpoint.

---

## 3. Accidental route layout under `/api/auth` (context for future work)

Not a bug today, but worth knowing before anything is moved.

`adminRoutes` and `authRoutes` are both mounted on `/api/auth`:

- `adminRoutes` → `POST /api/auth` (admin login), `/api/auth/users`,
  `/api/auth/stats`, `/api/auth/profile`, `/api/auth/audit-logs`,
  `/api/auth/devices`, `/api/auth/dashboard-kpis`
- `authRoutes` → `/api/auth/login`, `/register`, `/refresh`, `/me`, `/logout`,
  `/forgot-password`, `/reset-password`

Their paths happen not to collide, so both work — but admin endpoints living
under `/api/auth/*` is confusing, and any new route added to either router
could shadow the other. Mount order in `src/server.js` (`adminRoutes` before
`authRoutes`) is load-bearing and preserved from the previous auto-loader.

Moving admin endpoints to `/api/admin/*` is the right change; it requires
updating the admin web shell in `src/public/admin` at the same time.
