# 📈 Target: Achieving 100/100 Project Rating (Rank Improvement Checklist)

This section highlights the critical modifications required to elevate our project rating from **92.8/100** to **100/100**, directly improving our Hackathon standings (Target: jump from Rank #697).

### 🛠️ 1. Code Quality (Target: 86 → 100)
- **Modular Backend Architecture**: Refactor `apps/api/src/server.ts` by splitting routes, services, and middleware into separate files (e.g., controllers, validators).
- **Component Refactoring**: Deconstruct `apps/web/src/App.tsx` from a single massive file into modular, reusable component directories (e.g., `/components/Dashboard`, `/components/EcoSphere`, `/components/Forms`).
- **Strict TypeScript Typing**: Remove remaining `any` parameters in endpoints and type utilities; enforce strict compiler checks and static typing for all interfaces.
- **Centralized Error Handling**: Implement a global error-handling middleware in Express to standardize error responses and clean up inline try/catch blocks.

### 🔒 2. Security Hardening (Target: 95 → 100)
- **HTTP Security Headers**: Add `helmet` middleware in Express to configure secure HTTP headers (e.g., Content Security Policy, XSS Protection).
- **API Rate Limiting**: Introduce `express-rate-limit` to prevent brute force and denial of service attacks.
- **Strict Input Validation**: Implement `zod` schema validations on all API request body payloads (e.g., `/api/users`, `/api/carbon-events`, `/api/challenges/progress`) to reject malformed data early.
- **Secure JWT Storage & Handling**: Upgrade JWT authentication flow to use HttpOnly, secure cookies instead of plain localStorage/headers, mitigating cross-site scripting (XSS) risks.

### 🧪 3. Comprehensive Testing (Target: 94 → 100)
- **Frontend Test Suite**: Configure Vitest and React Testing Library in `apps/web` and write component-level tests for `App.tsx` / `EcoSphere`.
- **API Integration Tests**: Implement `supertest` suites in `apps/api` to verify authentication middleware, carbon calculators, and reward redemptions.
- **Mock Service Integration**: Write mock handlers for Arcadia, Nest, and Radar APIs to allow deterministic integration test runs in CI/CD.

### ♿ 4. Accessibility (a11y) Compliance (Target: 93 → 100)
- **Semantic Structure & ARIA Labels**: Conduct a full accessibility audit of the React UI. Add missing `aria-label`, `aria-describedby`, and `role` tags to interactive charts and icons.
- **Keyboard Navigation**: Ensure all interactive dashboard inputs, simulated sliders, and B-Corp reward items are fully focusable and keyboard-navigable (`Tab` key support).
- **WCAG Contrast Ratios**: Adjust HSL-based glassmorphism color parameters in `App.css` to guarantee text elements maintain proper contrast (minimum 4.5:1 ratio) against dark and translucent backgrounds.

### 🎯 5. Problem Statement Alignment (Rank #697 → Top Tier)
- **Connect Live API Widgets**: Complete the Arcadia OAuth Widget flow in UI, verify actual Nest ambient temperature fetches, and display valid Eden/Shopify receipt pages.
- **Cron Reset Dashboard**: Implement the UI administrative reset triggers and live notification systems for Eco-Leagues weekly evaluations.

---

# 🔄 Required Changes: Transitioning from Simulation to Production

This document outlines the architectural and code changes required to transition the **Footprint** application from a simulated prototype to a fully working production application.

---

## 🔍 Production Readiness Gap Assessment

Here is the exact status of the platform components comparing backend capabilities against user-facing integrations:

| Component / Service | Backend Capability | Frontend UI Status | Production Action Required |
| :--- | :--- | :--- | :--- |
| **Authentication** | 🟢 100% Production (JWT Verification) | 🟢 100% Production (Attaches Authorization headers) | None (Ready for deployment) |
| **PostgreSQL Database** | 🟢 100% Production (Prisma relations) | 🟢 100% Production (Renders charts & lists) | None (Ready for deployment) |
| **Grid Carbon Factors** | 🟢 100% Production (Electricity Maps API) | 🟡 Hybrid (Accepts any postal code input) | Add regex postal code validation to frontend |
| **Eco-Leagues** | 🟢 100% Production (Shared pools & cron) | 🟡 Partial (Renders board; no evaluation triggers) | Create admin dashboard for manual crons |
| **Nest Thermostat** | 🟡 Hybrid (Live SDM API / Simulation fallback) | 🟡 Partial (Display only; no refresh trigger) | Configure Google Device Access keys |
| **Radar.io Transit** | 🟡 Hybrid (HMAC validation / Sandbox fallback) | 🟢 100% Production (Queries local SDK coordinates) | Set up Radar project webhook webhook key |
| **Eden Tree Planting** | 🟡 Hybrid (Eden Projects POST / Simulated URL) | 🟢 100% Production (Renders receipt link) | Secure `EDEN_API_KEY` in Secret Manager |
| **Shopify Couponing** | 🟡 Hybrid (Shopify Admin POST / Sandbox code) | 🟢 100% Production (Shows discount codes) | Secure Shopify tokens in Secret Manager |

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
