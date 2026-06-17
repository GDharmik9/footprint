# ⚙️ Backend Core API (`apps/api`)

This document details the Express.js backend application, database layer, Google Cloud Platform (GCP) configurations, and REST endpoints for the **Footprint** project.

---

## 📂 Code Structure & Organization

The backend source files are located under [`apps/api/src`](file:///d:/new_era/Hackthon/footprint/apps/api/src):
- **`server.ts`**: Express application entry point containing routing definitions, middleware configurations, error handlers, and Pub/Sub subscriptions.
- **`database.ts`**: Holds PostgreSQL connection pools, SQL execution scripts, dev fallbacks, and seed data.
- **`gcp.ts`**: Interfaces with Google Cloud APIs, Secret Manager, and Pub/Sub publishers.

---

## 🗄️ Database Management Layer (`database.ts`)

The database layer handles multi-environment configurations:
- **Production Mode**: Connects to a PostgreSQL instance using connection strings from environmental variables or GCP Secret Manager.
- **Local Fallback Mode**: When a PostgreSQL connection fails, it automatically switches to a local file database stored in `footprint_dev_db.json`.
- **Automatic Seed Routines**:
  - `seedUserChallenges(userId)`: Initializes 7-day habit streaks.
  - `seedWeeklyLeague(userId)`: Generates 29 mock players to populate the leaderboard.
  - `server.ts` user onboarding: Backfills 6 months of historical carbon logs to render charts immediately.

---

## ☁️ Google Cloud Platform Integration (`gcp.ts`)

`gcp.ts` exposes helper routines for production GCP integrations:
- **`getSecret(name)`**: Pulls configuration values from GCP Secret Manager.
- **`publishCarbonEvent(payload)`**: Serializes and publishes telemetry payloads to Pub/Sub topics.
- **`startPubSubSubscriber(callback)`**: Pulls message buffers from Pub/Sub queues and routes them back to database writers, keeping processing asynchronous.

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
  - **Response (201 Created)**: Returns the user object, levels, streaks, and generated carbon baseline.

- **`GET /api/users/:id`**
  - **Response (200 OK)**: Returns the user profile details.

---

### 2. Carbon Ingestion Logging
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
  - **Response (201 Created)**: Returns the computed carbon footprint and awarded leaves.

- **`GET /api/carbon-events/:userId`**
  - **Response (200 OK)**: Returns a list of carbon logs sorted by date.

---

### 3. Habits & Streaks
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

### 4. B-Corp Sponsorship & Rewards
- **`POST /api/sponsors/redeem`**
  - **Request Body**:
    ```json
    {
      "userId": "uuid-here",
      "sponsorName": "Oatly",
      "rewardType": "discount",
      "costLeaves": 150
    }
    ```
  - **Response (201 Created)**: Deducts leaves and returns the generated voucher.

- **`GET /api/vouchers/:userId`**
  - **Response (200 OK)**: Returns a list of redeemed B-Corp vouchers.

---

### 5. Competitive Leagues Leaderboard
- **`GET /api/leagues/:userId`**
  - **Response (200 OK)**: Returns leaderboard listings containing real user standings alongside mock competitor stats.

---

### 6. External Ingestion Webhooks
- **`POST /api/webhooks/radar`**: Ingests transit edge summaries from Radar.io.
- **`POST /api/webhooks/arcadia`**: Ingests monthly utility billing metrics.
- **`POST /api/webhooks/nest`**: Validates Nest Eco-mode thermostat states.
