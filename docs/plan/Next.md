# 🚀 Ordered Next Moves Plan (Next.md)

This document establishes the step-by-step sequence of development tasks required to transition **Footprint** from its current MVP simulation phase into a production-grade working application.

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

### 📍 Step 6: Deploy Real Competitive Leagues Standings
- **Objective**: Replace randomized competitor algorithms with real user groupings.
- **Action Items**:
  1. Write SQL query helpers to group active users into 30-person league tables.
  2. Implement weekly cron routines to manage user standings, promotions/demotions, and weekly streak evaluations.

### 📍 Step 7: Integrate Reward Fulfillment Integrations
- **Objective**: Provide users with actual, validated rewards.
- **Action Items**:
  1. Connect `POST /api/sponsors/redeem` to the Eden Reforest Projects API to trigger tree plantings.
  2. Integrate verified corporate sponsor inventories (e.g. Shopify API) to fetch real discount coupons.

### 📍 Step 8: Build Cloud Deployment Pipelines
- **Objective**: Move the local monorepo to production on Google Cloud Platform.
- **Action Items**:
  1. Create Google Cloud Build configurations (`cloudbuild.yaml`).
  2. Deploy API services to GCP Cloud Run.
  3. Configure Google Cloud Pub/Sub queues to ingest telemetry streams asynchronously.
  4. Secure connection strings inside GCP Secret Manager.
