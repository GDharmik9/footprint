# ⚡ Critical Score Elevation Path (92.8 → 100/100)


___

This sequence outline defines the immediate execution workflow to optimize Code Quality, Security, Testing, and Accessibility to improve our leaderboard rank (Current Rank: #697).

### 📋 Optimization Action Items

1. [x] **Project Statement Alignment Milestones**: Implemented contextual equivalents, 1-click quick action trackers, trend chart breakdown toggles, history logs deletion, AI Climate Coach recommendations, and frictionless onboarding.
   - [x] **Frictionless Onboarding**: Auto-assigned eco names, GeoIP location detection, and progressive profiling checklist widget.
   - [x] **1-Click Quick Trackers**: Rapid habit logging for meals, commutes, EV drives, and solar power generation.
   - [x] **Contextual Carbon Equivalents**: Mapped emission figures to relatable comparisons (trees planted, vehicle miles, smartphone charges).
   - [x] **Trends stacked chart breakdown**: Interactive chart toggles switching between total trend lines and stacked monthly HSL category bar segments.
   - [x] **Footprint Activity Logs feed**: Clean feed panel allowing logs search and secure deletion (cloud database syncing & local sandbox fallbacks).
   - [x] **AI Climate Coach Engine**: dynamic insights based on 30-day user telemetry recommending custom interactive micro-tasks.

2. **Step A: Security Hardening & Input Verification**
   - [ ] Install dependencies: `helmet`, `express-rate-limit`, `zod`.
   - [ ] Apply `helmet` and rate limiting policies in `server.ts`.
   - [ ] Create schemas using `zod` for all request bodies; reject invalid input with status `400`.
   - [ ] Upgrade JWT storage flow to secure cookie handling.

3. **Step B: Backend & Frontend Refactoring (Code Quality)**
   - [x] Extract controllers and services out of `server.ts`.
   - [x] Subdivide `App.tsx` into `/components` (e.g., `EcoSphere.tsx`, `ArchetypeForm.tsx`, `Simulator.tsx`, `RewardsHub.tsx`).
   - [x] Resolve TypeScript compiler warnings and type any fallback properties.

4. **Step C: Test Coverage Implementation**
   - [ ] Set up testing frameworks in `apps/web` (Vitest/React Testing Library) and `apps/api` (Supertest).
   - [ ] Achieve >90% coverage for carbon math, core user endpoints, and dashboard widgets.

5. **Step D: Accessibility Audit & Fixes**
   - [ ] Update `App.css` variables to ensure standard high-contrast options.
   - [ ] Map tabIndex and keypress events for all simulated sliders and custom UI elements.
   - [ ] Wrap non-semantic components in semantic HTML5 with complete ARIA attributes.

---

# 🚀 Ordered Next Moves Plan (Next.md)

This document establishes the step-by-step sequence of development tasks required to transition **Footprint** from its current MVP simulation phase into a production-grade working application.

---

## 🔍 Post-Deployment & Production Launch Actions

Following the completion of the 8 core development steps, the remaining tasks to achieve 100% live deployment readiness include:

### 🔑 1. Secret Configuration (GCP Secret Manager) (Completed)
- [x] Set database connection parameters in the `DATABASE_URL` secret.
- [x] Generate and set the master `JWT_SECRET` key for route authorization.
- [x] Connect production API keys for external services:
  - `ELECTRICITY_MAPS_API_KEY` (Grid factors)
  - `RADAR_WEBHOOK_SECRET` (Transit webhooks HMAC verification)
  - `NEST_ENTERPRISE_ID` & `NEST_DEVELOPER_ACCESS_TOKEN` (Thermostat checking)
  - `EDEN_API_KEY` (Reforest tree plantings)
  - `SHOPIFY_ACCESS_TOKEN` & `SHOPIFY_SHOP_NAME` (B-Corp discount coupons)

### 💻 2. Frontend-Backend Gap Resolutions
- [x] Add format validation (regex matching) on the client postal code input field in `App.tsx` before dispatching.
- [ ] Add a dashboard action button on the client UI to manually trigger Nest thermostat updates.
- [ ] Expose an administrator settings page to trigger the manual leagues reset endpoint (`POST /api/admin/leagues/evaluate`).

---

## 📋 Sequence of Action Items

### 📍 Step 1: Write Core Mathematical Tests (Completed)
- **Objective**: Ensure the carbon calculation library operates with 100% precision.
- **Action Items**:
  - [x] Configure Jest (or Vitest) for the `@footprint/carbon-math` workspace.
  - [x] Write unit tests checking output variables for housing, transport, diet, and baselines computation functions.

### 📍 Step 2: Establish Postgres & Migrations Management (Completed)
- **Objective**: Transition away from inline raw queries and local JSON file fallbacks (`footprint_dev_db.json`).
- **Action Items**:
  - [x] Set up a local Docker Compose file launching a PostgreSQL database.
  - [x] Implement an ORM/migration tool (e.g., **Prisma** or **Knex**) to create and manage schemas.
  - [x] Update database interface configurations to connect directly to the Postgres instance in both development and production environments.

### 📍 Step 3: Implement Authentication and Route Security (Completed)
- **Objective**: Secure database records and API endpoints.
- **Action Items**:
  - [x] Set up a JWT-based authentication flow (or Firebase Auth integration).
  - [x] Write an Express.js security middleware layer checking bearer tokens in header parameters.
  - [x] Modify database endpoints (`POST /api/carbon-events`, `/api/challenges/progress`, etc.) to process data based on verified user session IDs.

### 📍 Step 4: Integrate Live Grid Factors (Completed)
- **Objective**: Replace static coefficient constants with live data.
- **Action Items**:
  - [x] Integrate the **Electricity Maps API** to fetch real-time grid carbon factors based on user zip code inputs.
  - [x] Implement a local caching mechanism in the server or connect Redis to cache grid coefficients for 1 hour to prevent API timeouts.

### 📍 Step 5: Replace Integration Webhooks with Live Connections (Completed)
- **Objective**: Transition simulation endpoints to live connections.
- **Action Items**:
  - [x] **Arcadia API**: Incorporate the Arcadia Connect OAuth widget into the React client frontend and securely handle OAuth redirects.
  - [x] **Google Nest API**: Set up Google Home Device Access integration to fetch live thermostat status.
  - [x] **Radar.io SDK**: Initialize and configure the Radar.io SDK on client devices to track transit metrics.

### 📍 Step 6: Deploy Real Competitive Leagues Standings (Completed)
- **Objective**: Replace randomized competitor algorithms with real user groupings.
- **Action Items**:
  - [x] Write SQL query helpers to group active users into 30-person league tables.
  - [x] Implement weekly cron routines to manage user standings, promotions/demotions, and weekly streak evaluations.

### 📍 Step 7: Integrate Reward Fulfillment Integrations (Completed)
- **Objective**: Provide users with actual, validated rewards.
- **Action Items**:
  - [x] Connect `POST /api/sponsors/redeem` to the Eden Reforest Projects API to trigger tree plantings.
  - [x] Integrate verified corporate sponsor inventories (e.g. Shopify API) to fetch real discount coupons.

### 📍 Step 8: Build Cloud Deployment Pipelines (Completed)
- **Objective**: Move the local monorepo to production on Google Cloud Platform.
- **Action Items**:
  - [x] Create Google Cloud Build configurations (`cloudbuild.yaml`).
  - [x] Deploy API services to GCP Cloud Run.
  - [x] Configure Google Cloud Pub/Sub queues to ingest telemetry streams asynchronously.
  - [x] Secure connection strings inside GCP Secret Manager.
