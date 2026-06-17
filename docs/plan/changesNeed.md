# 🔄 Required Changes: Transitioning from Simulation to Production

This document outlines the architectural and code changes required to transition the **Footprint** application from a simulated prototype to a fully working production application.

---

## 🔒 1. User Authentication & Security
*   **Current State**: Onboarding generates a random UUID (`crypto.randomUUID()`) and saves the profile. Endpoints are unprotected, and there is no user login/session verification.
*   **Production Requirement**:
    *   Integrate a secure identity provider (e.g., Firebase Authentication, Auth0, or JWT-based authentication).
    *   Add authentication middleware to Express API routes to verify bearer tokens in the Authorization header.
    *   Link database queries strictly to the authenticated user ID extracted from the token.

---

## 🔌 2. Real-World API Integrations (Replacing Stubs)

### A. Utility Ingestion (Arcadia API)
*   **Current State**: Webhook endpoint `POST /api/webhooks/arcadia` accepts manual input values without token verification.
*   **Production Requirement**:
    *   Implement Arcadia Connect OAuth widget in the frontend.
    *   Store encrypted user tokens in the database.
    *   Set up a background cron worker to poll the Arcadia bills endpoint monthly or configure verified Arcadia webhook signature validation.

### B. Smart Home Thermostat (Google Nest API)
*   **Current State**: Webhook `POST /api/webhooks/nest` is mocked with a simple payload.
*   **Production Requirement**:
    *   Register the application in the Google Home Device Access Console.
    *   Implement Nest Smart Home OAuth flow.
    *   Query Nest devices to fetch live ambient temperatures and eco-mode statuses rather than relying on self-reported webhooks.

### C. Geolocation & Transit (Radar.io SDK)
*   **Current State**: Radar webhook `POST /api/webhooks/radar` parses mocked parameters.
*   **Production Requirement**:
    *   Configure the Radar.io SDK on mobile clients.
    *   Deploy secure webhook validation using signature keys.
    *   Implement route classification fallback algorithms when edge classifiers fail.

### D. Real-Time Grid Carbon Factors (Electricity Maps)
*   **Current State**: Grid emission factors are static constants (`GRID_FACTORS`) in `@footprint/carbon-math`.
*   **Production Requirement**:
    *   Connect to the Electricity Maps API to fetch real-time grid carbon intensity ($gCO_2e/kWh$) based on GPS coordinates.
    *   Use EPA eGRID data as a fallback when API queries timeout.

---

## 🏆 3. Leaderboard & Eco-Leagues
*   **Current State**: Leaderboards are populated with 29 mock players generated via `Math.random()`.
*   **Production Requirement**:
    *   Group real users into active 30-person league tables.
    *   Implement weekly cron jobs (e.g., via Cloud Scheduler) to calculate standings, trigger promotions/demotions, and reset streaks.

---

## 🎁 4. Rewards Fulfillment & B-Corp Verification
*   **Current State**: Redemptions generate mock string coupon codes (`OATLY-15-...`).
*   **Production Requirement**:
    *   Connect the rewards engine to the sponsor's inventory systems (e.g. Shopify, Shopify API) to fetch real coupon codes.
    *   Integrate Eden Reforest Projects webhooks to trigger actual tree-planting actions upon leaf redemptions.
    *   Establish real-time check validations against B-Corp APIs or compliance databases.

---

## 💾 5. Database & Schema Migrations
*   **Current State**: Database setup runs raw `CREATE TABLE IF NOT EXISTS` queries on startup and uses local JSON storage as a developer fallback.
*   **Production Requirement**:
    *   Remove the local JSON fallback `footprint_dev_db.json` from production instances.
    *   Implement an ORM (like Prisma or Knex) to manage database migrations.
    *   Add cluster replicas for PostgreSQL to ensure database reliability.

---

## 🌐 6. Frontend Resilience & Error Boundaries
*   **Current State**: If the backend is offline, the client switches to a simulation mode using localStorage mock arrays.
*   **Production Requirement**:
    *   Replace simulation mode with robust error boundaries and offline alerts.
    *   Implement Workbox Service Workers to cache assets and queue API requests during network drops.
