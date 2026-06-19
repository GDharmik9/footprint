# ⚙️ Backend Core API (`apps/api`)

This document details the Express.js backend application, database layer, Google Cloud Platform (GCP) configurations, security middleware, and REST endpoints for the **Footprint** project.

---

## 📂 Code Structure & Organization

The backend source files are located under [`apps/api/src`](file:///d:/new_era/Hackthon/footprint/apps/api/src):
- **`server.ts`**: Express application entry point containing routing definitions, middleware configurations, error handlers, and Pub/Sub subscriptions.
- **`database.ts`**: Holds PostgreSQL client setup, schema seeds, and competitive league assignment algorithms.
- **`gcp.ts`**: Interfaces with Google Cloud APIs, Secret Manager, and Pub/Sub publishers/subscribers.
- **`auth.ts`**: Custom JWT authentication middleware ensuring secure resource paths.
- **`services/`**: Submodules containing business logic:
  - `cron.ts`: Handles weekly league evaluations, promotions, score resets, and mock competitor scoring.
  - `electricityMaps.ts`: Ingests and caches live grid carbon factors.
  - `nest.ts`: Connects to Google Nest SDM APIs.
  - `signatureVerification.ts`: Verifies webhook integrity using HMAC-SHA256.
  - `eden.ts`: Eden Reforest Projects integration client.
  - `shopify.ts`: Shopify discount coupon generator client.

---

## 🗄️ Database Management Layer (`database.ts`)

The database layer handles multi-environment configurations:
- **Production Mode (New)**: Managed via **Prisma ORM** mapping types to a PostgreSQL instance. Pushing schemas and synchronizing is executed using `npx prisma db push`.
- **Local Fallback Mode (Previous)**: If a PostgreSQL connection URL is missing or fails, the API previously relied on a zero-dependency JSON database saved inside `footprint_dev_db.json`.
- **Automatic Seed Routines**:
  - `seedUserChallenges(userId)`: Initializes 7-day habit streaks.
  - `seedWeeklyLeague(userId)`: Dynamically assigns the user to a 30-person league pool, and backfills empty slots with randomized mock competitor profiles within the same league ID.
  - `server.ts` onboarding: Backfills 6 months of historical carbon logs to render charts immediately.

---

## 🔒 Security & Verification Middleware

### 1. User Session Authentication (`auth.ts`)
- **Bearer Tokens**: Exposes `authenticateToken` middleware which inspects incoming `Authorization: Bearer <token>` headers.
- **Payload Signature**: Decodes the user session ID signed with the application's `JWT_SECRET`.
- **Protected Paths**: Secures user progress updates, carbon event logging, and sponsor rewards redemptions.

### 2. Webhook Signature Verification (`signatureVerification.ts`)
- **Payload Integrity**: Incoming webhook payloads from external ingestion portals (e.g. Radar.io, Arcadia) are secured via SHA256 HMAC tokens.
- **Verification**: Middleware verifies that payload hashes match the `RADAR_WEBHOOK_SECRET` or `ARCADIA_WEBHOOK_SECRET` stored securely in environment keys.

---

## 🔌 REST API Endpoints

### 1. User Management & Onboarding
- **`POST /api/users`**
  - **Request Body**:
    ```json
    {
      "display_name": "EcoWarrior",
      "postal_code": "90210",
      "archetype": {
        "housing": "apartment",
        "diet": "vegan",
        "commute": "transit"
      }
    }
    ```
  - **Response (201 Created)**: Returns the user profile, levels, streaks, carbon baseline, and an onboarding JWT session token.

- **`GET /api/users/:id`**
  - **Response (200 OK)**: Returns the user profile details.

---

### 2. Carbon Ingestion Logging (Secured)
- **`POST /api/carbon-events`**
  - **Request Body**:
    ```json
    {
      "userId": "uuid-here",
      "category": "transport",
      "source_provider": "manual",
      "raw_value": 45,
      "raw_unit": "miles",
      "transportMode": "hybrid"
    }
    ```
  - **Response (201 Created)**: Returns the computed carbon footprint (referencing cached Electricity Maps grid factors if local housing data is processed) and awarded leaves.

- **`GET /api/carbon-events/:userId`**
  - **Response (200 OK)**: Returns a list of carbon logs sorted by date.

---

### 3. Habits & Streaks (Secured)
- **`GET /api/challenges/:userId`**
  - **Response (200 OK)**: Returns active 7-day habit challenges.

- **`POST /api/challenges/progress`**
  - **Request Body**:
    ```json
    {
      "userId": "uuid-here",
      "challengeType": "cold-wash",
      "dayIndex": 3,
      "completed": true
    }
    ```
  - **Response (200 OK)**: Updates challenge streak logs and applies Leaf awards on completion.

---

### 4. B-Corp Sponsorship & Rewards (Secured)
- **`POST /api/sponsors/redeem`**
  - **Request Body**:
    ```json
    {
      "sponsorName": "Oatly",
      "rewardType": "discount",
      "costLeaves": 150
    }
    ```
  - **Response (201 Created)**: Deducts user leaves and issues a new voucher.
  - ** Fulfillments (New)**:
    - **Trees (`rewardType: 'tree'`)**: Fires a POST request to Eden Projects API (`https://api.edenprojects.org/v1/plantings`), saving the returned tree tracking receipt link in the voucher.
    - **Discounts (`rewardType: 'discount'`)**: Hits the Shopify Price Rules Admin API to dynamically create a checkout code (e.g. `OATLY-150-XXXXXX`).
  - **Previous/Simulated Details**: Previously, redemptions returned local mock descriptions and static coupon codes (e.g. `OATLY-15-HEX`). The new integrations gracefully fall back to these simulated patterns when api keys are not configured.

- **`GET /api/vouchers/:userId`**
  - **Response (200 OK)**: Returns a list of redeemed B-Corp vouchers.

---

### 5. Competitive Leagues Leaderboard (Secured)
- **`GET /api/leagues/:userId`**
  - **Response (200 OK)**: Returns leaderboard standings for the user's specific `leagueId`.
  - **Eco-Leagues Standings (New)**: Ranks users in 30-person pools. A weekly background worker (`cron.ts`) evaluates rankings, promotes the top 5 (giving levels and bonus leaves), shuffles mock competitor scores to simulate activity, and resets points.
  - **Previous/Simulated Details**: Previously, the API generated 29 separate random mock competitor records and saved them permanently alongside each registered user record.

---

### 6. External Ingestion Webhooks
- **`POST /api/webhooks/radar`**: Ingests transit edge summaries from Radar.io. (HMAC Verified)
- **`POST /api/webhooks/arcadia`**: Ingests monthly utility billing metrics. (HMAC Verified)
- **`POST /api/webhooks/nest`**: Validates Nest Eco-mode thermostat states.
