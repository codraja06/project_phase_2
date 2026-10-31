# AI-Powered Civic Issue Detection and Smart Complaint Management System

> **Final-Year Engineering Project — Phase 1 + Phase 2**
> Detects supported civic issues from photos using configured YOLO models, pins reports on a GPS map, submits them to a city authority, and enables the authority to track and resolve complaints through a status pipeline.

The current upgrade adds independently configured detection models, citizen civic assistance,
MongoDB-backed authority analytics, and the restored original red/white/navy UI. Model availability depends
on compatible trained weights; AI assistance depends on provider configuration. See
[the design system](DESIGN.md), [model configuration](ai-service/models/MODEL_CONFIGURATION.md),
and [Features 4–6 verification](FEATURES456_VERIFICATION.md).

For internet deployment, follow the [Render deployment procedure](RENDER_DEPLOYMENT.md). It covers the API, private AI service, MongoDB Atlas, Cloudinary, and a new Android APK.

The [25 October implementation audit](docs/CIVICTRACK_PHASE2_AUDIT_2026-10-25.md)
records all 18 feature statuses, real local execution, provider readiness, confirmed
fixes and remaining deployment/model work. Logout now revokes the current token in
MongoDB and closes its local live connection; raw bearer tokens are never stored in
the revocation collection. Manual complaints retain citizen text but cannot supply
trusted AI detection evidence without matching signed image analysis.

The [partial-feature follow-up](docs/PHASE2_PARTIAL_COMPLETION_2026-10-25.md)
records the subsequent fixes: editable provisional Avadi routing, authorization of
the existing authority administrator, durable complaint notification recovery,
cross-process live updates, shared MongoDB rate limits, password-session rotation
and native secure token storage. Missing trained weights/provider configuration
and remaining Expo dependency advisories are explicitly listed there.

### Export Operations Analytics to Power BI

Sign in with an administrator account, open **Operations Analytics**, choose the
filters and select **Apply filters**, then select **Export for Power BI**. The
download/share is a UTF-8 CSV for Power BI Desktop: choose **Get data → Text/CSV**
and open the exported file. This creates a data source; Power BI Desktop is used
to build and save the `.pbix` report. Mobile users can share/save the CSV through
the device share sheet. An updated native build is required for the file-sharing
module.

The export uses the applied creation-date, status, category, department and
search filters and includes up to 50,000 actual matching complaints. Narrow the
date range if the limit is exceeded. Fields include report identifiers, category,
department, status, severity, current calculated priority, UTC timestamps,
resolution hours, verification and coordinates. Unresolved or invalid resolution
durations are empty; citizen names, contact details, descriptions, addresses and
image URLs are omitted. The file nevertheless includes precise GPS coordinates.
Spreadsheet formula-like text fields are escaped. Only administrators can export
until department-level access controls are implemented across the authority portal.
The authenticated endpoint is `GET /api/authority/analytics/export` and returns
the CSV and row count in the normal JSON API envelope.

---

## Architecture

```
[ React Native Expo Mobile App ]
     │
     ├── Citizen Interface: Camera → AI Detection → GPS → Submit Complaint
     └── Authority Interface: Dashboard → Review → Status Update (Pending → In Progress → Resolved)
           │
           │  REST API (JWT Authenticated, RBAC enforced)
           ▼
[ Node.js Express TypeScript Backend ]  ←→  [ MongoDB Database ]
     │                                  ←→  [ Cloudinary (image storage) ]
     └── AI Proxy (forwards image to Python service)
           │
           ▼  multipart/form-data
[ Python FastAPI + Ultralytics YOLOv8 AI Microservice ]
     └── models/best.pt → Returns { className, confidence, bbox: {x1,y1,x2,y2} }
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | React Native, Expo 51, TypeScript, React Navigation, Zod, React Hook Form, Expo Camera, Expo Location, react-native-maps, Axios |
| **Backend** | Node.js, Express, TypeScript, JWT, bcrypt, Helmet, CORS, Rate Limiting, Zod, Multer, Mongoose |
| **Database** | MongoDB (local or Atlas) |
| **Image Storage** | Cloudinary in production (local fallback during development) |
| **AI Service** | Python, FastAPI, Ultralytics YOLOv8, OpenCV, Pillow |

---

## Project Structure

```
project1/
├── backend/           Node.js Express API (port 5000)
│   ├── src/
│   │   ├── config/   (env, db, cloudinary)
│   │   ├── controllers/
│   │   ├── middleware/ (auth, rbac, upload, errorHandler, rateLimiter)
│   │   ├── models/   (User.ts, Complaint.ts)
│   │   ├── routes/
│   │   ├── services/ (cloudinaryService, aiService)
│   │   ├── utils/    (jwt, apiError, apiResponse)
│   │   └── validators/
│   └── .env          ← single backend configuration (Git-ignored)
│
├── ai-service/        Python FastAPI (port 8000)
│   ├── app/          (main.py, detector.py, schemas.py, config.py)
│   ├── models/       ← place best.pt here
│   ├── training/     (train.py, dataset.yaml, README.md)
│   └── requirements.txt
│
└── mobile/            React Native Expo App
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── navigation/
    │   ├── screens/
    │   │   ├── auth/      (Splash, CitizenLogin, CitizenRegister, AuthorityLogin)
    │   │   ├── citizen/   (Dashboard, ReportIssue, History, Detail, Notifications, Profile)
    │   │   └── authority/ (Dashboard, Complaints, Detail, Profile)
    │   └── types/
    ├── .env          ← create from .env.example
    └── .env.example
```

---

## Environment Variables Setup

### 1. Backend — single configuration file: `backend/.env`

Keep all backend settings in this one Git-ignored file. For a fresh checkout, create
`backend/.env` from the safe example below and fill credentials privately.

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/civic_issue_db
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Same Google OAuth Web client ID used by the mobile app. Never put a client
# secret in the mobile app; the backend verifies Google's signed ID tokens.
GOOGLE_CLIENT_ID=

# ── Cloudinary Setup (Optional) ───────────────────────────────────────────────
# If left empty, images are stored locally in the backend/uploads/ folder.
# Sign up free at https://cloudinary.com
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── Python AI Microservice URL ────────────────────────────────────────────────
# Default is localhost. Change this if AI service runs on a different machine.
AI_SERVICE_URL=http://127.0.0.1:8000

# ── Backend Public URL (IMPORTANT for physical device testing) ────────────────
# When Cloudinary is NOT configured, uploaded images are served from this URL.
# Set to your machine's LAN IP so mobile devices can display uploaded images.
# Find your LAN IP:  Windows: ipconfig → IPv4 Address
#                    Mac/Linux: ifconfig → inet
# Example: http://192.168.1.105:5000
BACKEND_PUBLIC_URL=http://127.0.0.1:5000

# ── Google Maps API Key ───────────────────────────────────────────────────────
# Optional. Get one from https://console.cloud.google.com/
GOOGLE_MAPS_API_KEY=
# Civic assistance: server-side chat-completions-compatible endpoint.
# Example endpoint shape: https://your-provider.example/v1/chat/completions
# Leave unset to use the clearly labeled built-in civic guide.
CHAT_PROVIDER_URL=
CHAT_PROVIDER_MODEL=
CHAT_PROVIDER_API_KEY=

# Duplicate-warning policy. Same-category, unresolved reports within this radius
# and lookback period are only suggestions; officers confirm links manually.
DUPLICATE_RADIUS_METERS=120
DUPLICATE_LOOKBACK_DAYS=30

# Optional municipal service target. Leave empty until the municipality sets one.
# When configured, unresolved complaints older than this many hours count as overdue.
RESOLUTION_TARGET_HOURS=

# Conservative visual similarity support; requires the local AI image-signature endpoint.
DUPLICATE_MAX_HASH_DISTANCE=10
DUPLICATE_MIN_COLOR_SIMILARITY=0.85
# Geographic grid size and default lookback (days); API filters may override these.
HOTSPOT_CELL_DEGREES=0.01
HOTSPOT_WINDOW_DAYS=30

# Email OTP + resolution email. Empty placeholders; defaults are in the comments.
# OTP: 5 minutes, 60-second cooldown, 5 attempts, 5 requests/contact/hour.
OTP_EXPIRY_MINUTES=
OTP_RESEND_COOLDOWN_SECONDS=
OTP_MAX_ATTEMPTS=
OTP_HOURLY_LIMIT=
# Optional dedicated random HMAC key; falls back to JWT_SECRET. Keep stable across replicas.
OTP_HASH_SECRET=
# Optional: true requires a separate phone OTP before account creation (default false).
OTP_REQUIRE_PHONE=
SMTP_HOST=
# Default 587 with required STARTTLS; 465 uses implicit TLS.
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

# Optional SMS: set SMS_PROVIDER to twilio; sender must be the Twilio E.164 number.
SMS_PROVIDER=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
# Default true. Run at least one persistent Node process for background delivery.
DELIVERY_WORKER_ENABLED=

# Shared rate limits default to MongoDB outside tests. Use the same database/key
# across API replicas. Memory is suitable only for isolated tests/local diagnosis.
RATE_LIMIT_STORE=mongo
# Production: comma-separated trusted web origins; no wildcard. Empty denies
# browser origins in production. Native requests without Origin are supported.
CORS_ORIGINS=
```

### 2. AI Service — `ai-service/.env` (create if not present)

```env
AI_PORT=8000
MODEL_PATH=models/best.pt
CONF_THRESHOLD=0.25
```

### 3. Mobile App — `mobile/.env` (copy from `.env.example`)

```env
# IMPORTANT: Use your machine's LAN IP when testing on a physical device.
# Find your LAN IP:
#   Windows: ipconfig → IPv4 Address (e.g. 192.168.1.105)
#   Mac/Linux: ifconfig → inet (e.g. 192.168.1.105)
#
# Android emulator: use 10.0.2.2
# iOS simulator / Expo Web: use 127.0.0.1

EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:5000/api

# Get a free key from https://console.cloud.google.com/
# Enable: Maps SDK for Android, Maps SDK for iOS
# Also paste the same key into app.json → expo.android.config.googleMaps.apiKey
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

---

## Running the Project

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB running locally on port 27017 (or set `MONGODB_URI` to Atlas)
- Expo CLI: `npm install -g expo-cli` (optional — `npx expo` also works)

### Step 1 — Start MongoDB

Local:
```bash
mongod
```
Or use [MongoDB Community Server](https://www.mongodb.com/try/download/community) / [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

### Step 2 — Start the Backend

```bash
cd backend
npm install
# Create/edit backend/.env using the backend configuration example above
npm run dev                 # starts on http://localhost:5000
```

Verify: `http://localhost:5000/health` → `{ "status": "OK" }`

### Step 3 — Start the AI Microservice

```bash
cd ai-service

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

Verify: `http://localhost:8000/health`
- `"modelConfigured": false` → `best.pt` not placed yet (normal if not yet trained)
- `"modelConfigured": true` → model is ready for detection

### Step 4 — Start the Mobile App

```bash
cd mobile
npm install
cp .env.example .env        # then edit .env with your LAN IP
npx expo start
```

- Press `a` to open on Android emulator
- Scan QR code with **Expo Go** app on a physical device
- Press `w` to open in web browser

---

## AI Model Setup

The AI service requires a trained YOLO model at `ai-service/models/best.pt`.

**Without `best.pt`:** The app will show `"AI detection service is currently unavailable"` gracefully — all other features (submit, history, authority workflow) still work.

**To train your own model:**
```bash
cd ai-service/training
# Read README.md for dataset setup
python train.py --epochs 100 --batch 16
# best.pt is automatically copied to ../models/
```

See [`ai-service/training/README.md`](ai-service/training/README.md) for full training instructions with RDD2022.

---

## API Reference

### Auth Endpoints
```
POST   /api/auth/signup/request-otp  Request email OTP; optional configured SMS
GET    /api/auth/signup/options      Check email/SMS configuration availability
POST   /api/auth/signup/verify-otp   Verify email or phone independently
POST   /api/auth/signup/resend-otp   Replace challenge subject to limits
POST   /api/auth/signup/complete     Create citizen after required verification
POST   /api/auth/register            Compatibility alias for verified completion
POST   /api/auth/login             Login (citizen or authority)
POST   /api/auth/logout            Logout (authenticated)
GET    /api/auth/me                Get current user
PUT    /api/auth/profile           Update name/phone
PUT    /api/auth/change-password   Change password
PUT    /api/auth/notification-preferences  Save email alerts and explicit SMS consent
```

### Citizen Endpoints (requires citizen JWT)
```
POST   /api/complaints             Submit new complaint
GET    /api/complaints/my          Get own complaints (filter: status, category, search)
GET    /api/complaints/:id         Get specific complaint
```

### Authority Endpoints (requires authority JWT)
```
GET    /api/authority/complaints              All complaints (filter, search, sort)
GET    /api/authority/complaints/:id          Complaint detail
PATCH  /api/authority/complaints/:id/status   Update status (Pending→In Progress→Resolved)
DELETE /api/authority/complaints/:id          Delete invalid complaint
```

### AI + Upload
```
POST   /api/ai/detect       Detect civic issue in image (multipart)
POST   /api/uploads/image   Upload image to Cloudinary
```

---

## Creating an Authority Account

There is no public UI to register as an authority. Insert an authority user directly into MongoDB:

```javascript
// In MongoDB shell or Compass:
db.users.insertOne({
  name: "Municipal Officer",
  email: "officer@city.gov",
  phone: "9876543210",
  password: "$2a$10$...", // bcrypt hash — see below
  role: "authority",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

To generate a bcrypt hash for a password (e.g. `officer123`):
```bash
cd backend
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('officer123', 10).then(h => console.log(h));"
```

Then log in via the app's **Officer / Authority Login** button.

---

## Testing

```bash
# Backend unit + integration tests
cd backend && npm test

# AI service tests
cd ai-service && python -m pytest tests/ -v

# Mobile TypeScript type check
cd mobile && npm run type-check
```

---

## Status Workflow

```
Pending → In Progress → Resolved
```

- Status transitions are **strictly enforced** on the backend.
- Only an **authority** can update status.
- When resolved, a `resolvedAt` timestamp is stored.
- No reverse transitions (e.g. Resolved → Pending).

---

## Supported Civic Issue Categories

| Category | Description |
|----------|-------------|
| `pothole` | Road surface depressions |
| `road_damage` | Cracks, surface deterioration |
| `garbage` | Accumulated waste / illegal dumping |
| `drainage` | Blocked / broken drainage |
| `broken_streetlight` | Non-functional street lighting |

> Phase 1 AI detection focuses primarily on **pothole** and **road_damage** as these have the best available training datasets (RDD2022). Other categories are supported in the UI and API.

---

## Security Features

- JWT authentication on all protected routes
- RBAC (role-based access control) — citizens cannot access authority endpoints
- bcrypt password hashing (never stored in plaintext)
- Helmet security headers
- CORS configured
- Rate limiting on auth endpoints
- Zod validation on all API inputs
- Generic error messages (no stack traces in production)
- All secrets via environment variables — **never committed to git**
# Phase 2: detection-based triage and complaint drafts

Phase 2 extends the existing report workflow with three features. The technology stack,
authentication, YOLO detections and bounding boxes, location selection, complaint statuses,
and authority verification workflow are retained.

1. **Severity estimate:** `/predict` in the Python service analyzes actual YOLO detections,
   detection confidence, category, and bounding-box coverage relative to image dimensions.
   It returns `Low`, `Medium`, or `High`, or a null level when evidence is insufficient.
   The citizen analysis/review/detail screens and authority views show the estimate.
   This is an **experimental rule-based interpretation of AI detections**, not a trained
   severity model. It has not been validated for severity accuracy. Detection confidence
   is not severity confidence; image coverage does not measure physical damage size.
2. **Complaint priority:** Express calculates the score; client-supplied priority is ignored
   on creation. Authority lists provide independent priority filters and priority/newest/oldest
   sorting. Priority never changes complaint status or verification.
3. **Complaint description:** the AI service verbalizes supported, confident detections,
   their counts, and image-space coverage into a short draft. This uses deterministic
   generation grounded in YOLO output, without an external language-model service.
   Citizens can edit or restore the draft and review it before submission. No confident
   detection means manual description entry. The description does not infer addresses,
   physical dimensions, causes, injuries, obstruction, or unseen damage. Location remains
   in the existing, separately confirmed GPS fields.

## Configuration and use

Use the existing configuration: backend `MONGODB_URI`, `JWT_SECRET`, `AI_SERVICE_URL`,
`BACKEND_PUBLIC_URL`, optional Cloudinary variables, and mobile `EXPO_PUBLIC_API_URL`.
No new runtime dependencies, paid APIs, or environment variables are required.
Deploy the AI service, backend, and mobile/web app together to enable signed analysis.

The detector loads these existing weights relative to `ai-service/`:

- `models/pothole_roaddamage/best.pt`
- `models/pothole_roaddamage/best_road.pt`
- `models/garbage_overflow/best.pt`
- `models/dead_animal_broken_tree/best.pt`

The existing `MODEL_PATH` fallback supports a single trained YOLO model. Missing weights
return an explicit service error; the citizen can still select a category and enter text.
Weights are Git-ignored and must be supplied separately on a fresh checkout/deployment.

Start the AI service from `ai-service` with
`python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`, the backend from `backend`
with `npm run dev`, and the app from `mobile` with `npm start` or `npm run web`.
Upload a photo, review detection and experimental severity, edit the description, confirm
the incident location, and review the final report. Authorities can use **Priority** and
**Sort complaints** controls in the Incident Registry. Refreshing or reopening a list
recalculates age-dependent scores.

## Policy, storage, and compatibility

`ai-service/app/assessment.py` contains versioned policy `detection-triage-v1`.
Only supported detections with confidence at least 0.60 and valid in-image boxes are used.
Category base scores range from 15 to 40. Coverage adds 15 points at 10% or 30 at 30%.
Scores below 35 yield Low, 35–59 Medium, and 60+ High. The highest severity across
eligible detections wins. These transparent thresholds are engineering defaults and need
evaluation against expert-labeled, representative images before operational reliance.

`backend/src/services/triageService.ts` defines `triage-priority-v1`:

- Severity contributes Low=10, Medium=35, High=65; unavailable severity contributes 25
  and flags the complaint for review.
- Category contributes 5–15. Each full unresolved day contributes 3, capped at 60.
- Total is capped at 100. High Priority is 65+, Medium Priority is 30–64, Low Priority is below 30.
- Resolved complaints have score 0 and accrue no attention score. Ties use oldest first.

MongoDB stores `severity` (level, state, policy version, unvalidated flag, reason,
model/category/confidence/coverage evidence, assessment timestamp and image hash),
`priority`, `priorityScore`, `priorityMetadata`, and `generatedDescription`. `description`
is always the final citizen-approved text. Creation stores a priority snapshot; API reads
recalculate current age-dependent priority without rewriting existing records or timestamps.
No migration, reseeding, or deletion is needed. Legacy reports display unavailable severity
and receive a computed priority on reads. Their descriptions and existing stored data remain intact.

Detection and upload endpoints return signed, user-bound `analysisToken` and `uploadToken`
(24-hour expiry). Complaint creation checks that both refer to the same image bytes and
uploaded URL, and stores service-generated evidence rather than client-edited analysis.
If tokens expire, reanalyze the photo or choose **Continue without AI assessment** and
submit the reviewed description manually. Legacy clients can still submit without tokens;
their severity is unavailable. No uploaded image URL is fetched by the server for analysis.

## Phase 2 verification

Run backend tests with `cd backend` then `npm test`. Tests force an isolated local test
database and cover evidence binding, manual fallback, persistence, role guards, and priority.
From `ai-service`, run `python -m pytest -q`; assessment tests cover all severity levels,
weak/invalid/missing evidence and descriptions, alongside existing detector tests.
From `mobile`, run `npm run type-check`.

See [PHASE2_VERIFICATION.md](PHASE2_VERIFICATION.md) for completed checks, file mapping,
captured evidence, and verification limits. The opt-in real-service browser test is
`mobile/tests/e2e/phase2-live.cjs`. It expects FastAPI on 8052, Express on 5052 with
`MONGODB_URI=mongodb://127.0.0.1:27017/civictrack_phase2_e2e`,
`AI_SERVICE_URL=http://127.0.0.1:8052`, `BACKEND_PUBLIC_URL=http://127.0.0.1:5052`,
and local image storage (Cloudinary variables empty). Start Expo on 8081 with
`EXPO_PUBLIC_API_URL=http://127.0.0.1:5052/api`. Set `PHASE2_TEST_IMAGE` to an absolute
path to a real civic-issue photo, then run `node tests/e2e/phase2-live.cjs` from `mobile`.
The test creates and cleans up its own accounts and complaints in that dedicated database.

Integration tests establish software behavior; severity accuracy has not been measured. Before relying
on severity decisions, evaluate a separate, expert-labeled dataset across categories,
lighting, viewpoints and locations; measure per-class precision/recall, confusion matrices,
uncertainty/abstention rates, and high-severity misses. Authorities retain final judgment.

## Features 4–6: model routing, assistance and authority insights

- **Detection models:** choose Automatic or a category in Report Issue. The server lists
  actual compatible classes, runs the relevant loaded models, and returns real coordinates,
  scores and model IDs. Missing or failed models provide clear fallback states. Configure
  independent model paths, enable flags and thresholds using
  [MODEL_CONFIGURATION.md](ai-service/models/MODEL_CONFIGURATION.md).
- **Civic Assistance:** citizens can open Assistance from primary navigation or the sidebar,
  ask about app workflows, and include their CIV reference to retrieve their recorded status.
  Conversation history is private. Configure `CHAT_PROVIDER_URL`, `CHAT_PROVIDER_MODEL` and
  optional `CHAT_PROVIDER_API_KEY` in the backend only. An unavailable provider produces a
  clearly labeled built-in guide. See [CIVIC_ASSISTANCE.md](docs/CIVIC_ASSISTANCE.md).
- **Authority insights:** Dashboard and Analytics use MongoDB aggregation for totals, status
  counts, live priority, category frequency, submission-day trends, geographic distribution
  and recent complaints. Apply date/category/status/search filters or open complaint lists
  from metrics. Lists support priority sorting/filtering and 25-record pagination.
- **Adaptive UI:** restored red/navy tokens, phone navigation, tablet rails, desktop
  sidebars/headers, wide report panes and responsive charts/lists. See [DESIGN.md](DESIGN.md).

The current streetlight/water-leakage models are unconfigured, and the supplied
`best_road.pt` is a pothole-only model. A real AI assistance provider is also unconfigured.
Those integration points are ready with explicit fallback states; they are not claimed
as validated production capabilities. Existing reporting, GPS/maps, authentication,
severity/priority/descriptions and authorized status updates remain available.

[FEATURES456_VERIFICATION.md](FEATURES456_VERIFICATION.md) lists files changed, actual test
results, configuration limits and commands to run the existing project.

## Current visual identity

The original CivicTrack interface has been restored using the existing Phase 1 source:
white cards and sidebar, soft red/pink accents, original logo/system typography and
red/navy authority styling. The citizen dashboard reuses its original reporting hero,
icon categories, search, activity cards and recent incidents. Current Phase 2 features,
responsive navigation and real API integrations remain available.

See [DESIGN.md](DESIGN.md) and [UI_RESTORATION_VERIFICATION.md](UI_RESTORATION_VERIFICATION.md)
for source provenance, changed files, verification and reference-image limitations.
The earlier master implementation report remains the record of backend feature work;
its green/blue visual direction is superseded by this restoration.

## Features 7–12: complaint operations

- Citizen review checks nearby same-category unresolved reports and warns before submission.
  Officers can confirm a duplicate with a recorded reason; reports remain separate.
- The authority map groups actual complaint coordinates into filterable hotspot cells
  and opens the underlying authorized reports.
- Administrators maintain internal category-to-department rules in Officer Profile.
  New reports use active rules; officers can reassign with a reason.
- Officers can upload a completion photo, review or reject it, and explicitly confirm
  resolution. Original evidence and new status history remain on the complaint.
- Citizen and authority notification screens use recipient-owned MongoDB event records
  with read/unread state. Push delivery is not configured.
- Analytics adds unresolved counts, completed resolution durations, department counts
  and UTC resolution trends. Overdue appears only when a service target is configured.

See [OPERATIONS_FEATURES.md](docs/OPERATIONS_FEATURES.md) for endpoint shapes, exact
formulas, security, thresholds, administrator provisioning, storage fields and tests.
Set `DUPLICATE_RADIUS_METERS` and `DUPLICATE_LOOKBACK_DAYS` only if the local policy
needs different warning thresholds. Set `RESOLUTION_TARGET_HOURS` only after the
municipality establishes a service target. Existing backend, AI and Expo startup
commands above are unchanged. The real provider and trained-model limitations noted
above still apply.

## Latest master implementation

All thirteen requested areas and their practical limits are listed in
[the implementation report](MASTER_IMPLEMENTATION_VERIFICATION.md). New additions include
signed visual fingerprints for duplicate review, authenticated live in-app notification
signals, configurable map grouping/window, exact median and unresolved-age analytics,
category/department drill-downs, and officer severity/priority correction history.
Original predictions, photos, final citizen-approved descriptions and status remain
separate. Existing records need no destructive migration.

The backend configuration example above documents `DUPLICATE_MAX_HASH_DISTANCE`,
`DUPLICATE_MIN_COLOR_SIMILARITY`, `HOTSPOT_CELL_DEGREES`, `HOTSPOT_WINDOW_DAYS` and
optional `RESOLUTION_TARGET_HOURS`. Existing install/start commands above still apply;
run `npm install` in backend after pulling to install WebSocket support. Deployments
must forward `/api/notifications/live` WebSocket upgrades. Push delivery while the app
is closed and cross-instance socket broadcasting are not configured.

Use [the model configuration](ai-service/models/MODEL_CONFIGURATION.md) and
[training/evaluation guide](ai-service/training/README.md) before adding new weights.
Current severity and duplicate thresholds are unvalidated baselines. Missing trained
models and external chat credentials produce explicit fallback states.

## OTP registration and resolution notifications

Verification emails use CivicTrack's red-and-white layout with a large, copyable
code, expiry notice, plain-text alternative and dark-mode styling for supporting
email clients. The OTP screen has a larger numeric field with paste/autofill support,
a live expiry timer, resend cooldown and separate verification/error messages.
Newly requested codes use the new email design; emails already in an inbox do not change.

Citizen sign-up now requires email verification before account creation. Codes last
five minutes, allow at most five guesses, have a 60-second resend cooldown and a
five-request contact limit per hour. The original sign-up page leads to a matching
verification step, then the existing authenticated dashboard. Existing accounts
continue to sign in as before; a password login alone does not verify their contacts.

Install the updated backend dependencies with `npm install` in `backend`, then set
the SMTP variables in `backend/.env` and restart the API. New variables in
the backend configuration example above are empty placeholders. Set a stable random `JWT_SECRET`
(at least 32 characters in production); optionally set a separate `OTP_HASH_SECRET`.
Configure `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASS`, and
`EMAIL_FROM`. For Gmail, the host is `smtp.gmail.com`; use the real sender account
and a new app password, never the example strings or an exposed password.
Missing SMTP configuration produces a setup error and creates no account.

Optional SMS uses `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
and `TWILIO_FROM`. The last value must be the actual Twilio sender in international
`+countrycode` format. `TWILIO_PHONE_NUMBER`, `SMS_API_KEY` and `SMS_API_SECRET`
are not variables consumed by this integration. SMS and email use separate OTPs.
Set `OTP_REQUIRE_PHONE=true` only when the SMS provider is ready; otherwise email
verification is required and phone verification is optional.

A real authority transition to Resolved now records one citizen notification,
category and resolution time, plus durable email/SMS jobs. The existing live
notification badge/list is reused. Email goes only to verified, opted-in email
addresses; SMS also requires a verified phone and explicit saved consent in
Profile → Notification Preferences. Delivery states appear on the notification.
The final complaint status remains saved if sending fails.

The worker starts with the existing backend and checks durable jobs every five
seconds. Keep at least one API process running (`DELIVERY_WORKER_ENABLED` defaults
to true). A request-only server that stops between requests will not run this
worker reliably. Retries cover definite temporary rejection; unknown provider
acceptance needs manual reconciliation to avoid blind duplicate sends. “Sent” in
MongoDB means provider acceptance, not confirmed inbox/handset delivery.

No existing records are deleted or automatically marked verified. New MongoDB
collections and additive indexes are described in the
[setup and migration guide](docs/OTP_NOTIFICATIONS.md), together with endpoint
payloads, safe delivery troubleshooting and the list of changed files.
See the [verification report](docs/OTP_NOTIFICATIONS_VERIFICATION.md) for actual
results and the remaining external-delivery requirements. No real email or SMS
delivery is claimed from mocked-provider tests.

If a development OTP was previously visible on the verification screen, reload the
app and start a new registration after configuring real sender credentials. The
code-display/logging fallback has been removed. Example strings such as `your_gmail`
or `your_twilio_account_sid` cannot send messages and are rejected as configuration.
`TWILIO_FROM` is the authorized sending number, while your receiving phone number
belongs in the sign-up form. See the setup guide's troubleshooting section above.

Sign-up now checks delivery availability before allowing an OTP request. It shows
an unavailable message when a required provider is missing, and explicitly says
when verification is email-only and no SMS will be sent. This check reveals no
credentials and never generates or displays a code.

After a successful Gmail OTP, an existing email leads to a clear sign-in action.
Use the account's existing login method, or change registration details for a new
email. Optional SMS failure does not block a new account's email verification.


## Simplified interface and department access

Reporting now follows Photo → Issue → Description → Location → Review. Advanced detection options and filters expand on demand. Operations Analytics separates overview, categories, geography and resolution reports while preserving the applied-filter Power BI export.

Ordinary officers require a department on their account. Existing administrators can configure it under **Profile & Settings → Department routing & access → Officer department access** using an existing officer email and an enabled routing department. Officers sign in again after an assignment. Unassigned reports remain available to administrators; existing records are not migrated or deleted automatically.

See [UI audit and plan](docs/UI_OPTIMIZATION_PLAN.md) and [verification and limitations](docs/UI_OPTIMIZATION_VERIFICATION.md).


## Final enhancement work in progress

The centralized audit foundation is integrated with a durable source outbox and an administrator-only filtered audit viewer under Profile & Settings. Start the backend normally; its audit relay runs every five seconds. No additional provider credentials are required. See [current audit, implementation status and remaining stages](docs/FINAL_ENHANCEMENT_AUDIT.md). The full seven-feature enhancement is not yet complete.
