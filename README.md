# AI-Powered Civic Issue Detection and Smart Complaint Management System

> **Final-Year Engineering Project — Phase 1 + Phase 2**
> Detects supported civic issues from photos using configured YOLO models, pins reports on a GPS map, submits them to a city authority, and enables the authority to track and resolve complaints through a status pipeline.

The current upgrade adds independently configured detection models, citizen civic assistance,
MongoDB-backed authority analytics, and an adaptive green/blue UI. Model availability depends
on compatible trained weights; AI assistance depends on provider configuration. See
[the design system](DESIGN.md), [model configuration](ai-service/models/MODEL_CONFIGURATION.md),
and [Features 4–6 verification](FEATURES456_VERIFICATION.md).

For internet deployment, follow the [Render deployment procedure](RENDER_DEPLOYMENT.md). It covers the API, private AI service, MongoDB Atlas, Cloudinary, and a new Android APK.

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
│   ├── .env          ← create from .env.example
│   └── .env.example
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

### 1. Backend — `backend/.env` (copy from `.env.example`)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/civic_issue_db
JWT_SECRET=change_this_to_a_long_random_secret_string
JWT_EXPIRES_IN=7d

# Cloudinary (optional — app uses local file fallback if left empty)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# URL of the Python AI microservice
AI_SERVICE_URL=http://127.0.0.1:8000

# Google Maps API Key (optional — used only by backend for reference)
GOOGLE_MAPS_API_KEY=
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
cp .env.example .env        # then edit .env with your values
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
POST   /api/auth/register          Register citizen
POST   /api/auth/login             Login (citizen or authority)
POST   /api/auth/logout            Logout (authenticated)
GET    /api/auth/me                Get current user
PUT    /api/auth/profile           Update name/phone
PUT    /api/auth/change-password   Change password
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
- **Adaptive UI:** shared green/blue tokens, phone navigation, tablet rails, desktop
  sidebars/headers, wide report panes and responsive charts/lists. See [DESIGN.md](DESIGN.md).

The current streetlight/water-leakage models are unconfigured, and the supplied
`best_road.pt` is a pothole-only model. A real AI assistance provider is also unconfigured.
Those integration points are ready with explicit fallback states; they are not claimed
as validated production capabilities. Existing reporting, GPS/maps, authentication,
severity/priority/descriptions and authorized status updates remain available.

[FEATURES456_VERIFICATION.md](FEATURES456_VERIFICATION.md) lists files changed, actual test
results, configuration limits and commands to run the existing project.

## Current visual identity

The full Expo application uses an original green and professional blue identity:
photographic authentication pages, citizen reporting hero, category photo tiles,
authority banners, consistent lists/details/forms/maps, notification views and profiles.
Seven licensed reference photos are bundled in `mobile/assets/civic`; source and license
credits are available in the app's profiles and the asset directory. Actual complaint images, detection coordinates,
backend data, permissions and navigation remain connected to their existing services.
See [DESIGN.md](DESIGN.md) for the current design system and
[MASTER_IMPLEMENTATION_VERIFICATION.md](MASTER_IMPLEMENTATION_VERIFICATION.md) for current tests, feature status and remaining external dependencies.

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

`backend/.env.example` documents `DUPLICATE_MAX_HASH_DISTANCE`,
`DUPLICATE_MIN_COLOR_SIMILARITY`, `HOTSPOT_CELL_DEGREES`, `HOTSPOT_WINDOW_DAYS` and
optional `RESOLUTION_TARGET_HOURS`. Existing install/start commands above still apply;
run `npm install` in backend after pulling to install WebSocket support. Deployments
must forward `/api/notifications/live` WebSocket upgrades. Push delivery while the app
is closed and cross-instance socket broadcasting are not configured.

Use [the model configuration](ai-service/models/MODEL_CONFIGURATION.md) and
[training/evaluation guide](ai-service/training/README.md) before adding new weights.
Current severity and duplicate thresholds are unvalidated baselines. Missing trained
models and external chat credentials produce explicit fallback states.
