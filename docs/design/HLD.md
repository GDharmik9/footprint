# 📐 High-Level Design (HLD) - Footprint System

The High-Level Design defines the macro architecture, ingestion pipeline mechanisms, security boundaries, and monorepo workspace separation of the **Footprint** platform.

---

## 🏗️ Overall Event-Driven Architecture

Footprint relies on a serverless event-driven architecture to scale microservices and process data asynchronously. Webhook events (e.g. from utility systems or transit edge trackers) are quickly received by the API, validated, and processed asynchronously via event brokers to minimize latency.

```
                                 [ Client Web/Mobile App ]
                                             │
                                             ▼ (HTTPS with JWT Bearer Token)
                                 [ Google Cloud API Gateway ]
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼ (JSON Webhook Ingest)         ▼ (REST API Routes)             ▼ (JSON)
    [ Ingestion Service ]           [ User/Rewards Service ]        [ Analytics Service ]
        (Cloud Run)                      (Cloud Run)                     (Cloud Run)
             │                                │                               │
             ▼ (Publish event)                └──────────────┬────────────────┘
       [ Cloud Pub/Sub ]                                     │
             │                                               │
             ▼ (Trigger event)                               ▼ (Queries)
   [ Calculation Engine Worker ] ──(Cache lookup)──► [ Memorystore for Redis ]
             │                                               │
             ▼ (Write SQL)                                   ▼ (Fetch factors)
      [ Cloud SQL Postgres ]                          [ Real-time Grid Factor APIs ]
             │
             ▼ (Analytics logs replication)
      [ TimescaleDB on GCE ]
```

---

## 🔌 Core Ingestion Pipeline Design

To minimize user effort and maximize data accuracy, Footprint automates raw data tracking through three dedicated pipelines:

1. **Utility Bill Ingestion (Arcadia API)**
   - Monthly utility billing files are pulled or received via webhooks (HMAC-SHA256 signature verified).
   - Extracts energy consumption ($kWh$ and gas therms).
   - Translates consumption into $CO_2e$ using cached regional emission factors from Electricity Maps.

2. **Transit & Commute Tracking (Radar.io SDK)**
   - The user's smartphone coordinates are monitored on-device by the Radar.io SDK.
   - Raw spatial tracking is calculated on the edge. Only transport classifications (e.g. SUV, electric car, walk/transit) and distance metrics are sent to the backend.
   - Inbound webhook payloads are validated using HMAC-SHA256 signatures.

3. **Smart Home Integration (Google Nest Device Access API)**
   - Captures real-time smart thermostat eco-settings, cooling/heating runtime metrics, and ambient temperatures.
   - Automatically rewards users when Eco-Mode is active.

---

## 🔒 Security, Authentication, & Authorization

- **JWT Session Tokens**: The client logs in / registers, receiving a JSON Web Token. Standard API endpoints check the `Authorization: Bearer <JWT>` header to resolve the user session, securing user data.
- **HMAC Signatures**: External webhook endpoints (Radar, Arcadia) verify payload integrity using SHA256 HMAC signature verification to prevent spoofed carbon logs.
- **Previous/Simulated Details**: In the initial prototype, authentication was simulated (endpoints trusted client-provided `userId` parameters with no headers), and webhook endpoints accepted all payloads without signing keys.

---

## 🎁 Sponsor Rewards & Eco-Leagues Fulfillment

### 1. B-Corp Sponsorship & Rewards Fulfillment
- **Tree Planting (Eden Reforest Projects)**: Redeeming leaves for tree planting triggers a live POST request to Eden Projects API to plant a tree and return a tracking receipt link.
- **Discount Codes (Shopify API)**: Redeeming leaves for partner brand discounts issues a real-time call to the Shopify Price Rule API to register a unique code.
- **Previous/Simulated Details**: Redemptions previously returned static voucher strings and mock descriptions locally. The updated version makes live integrations, falling back gracefully to sandbox models if keys are not present.

### 2. Eco-Leagues Standings
- **Weekly Leagues**: Users are grouped into 30-person pools. A weekly background evaluator (`cron.ts`) sorts standings, applies promotions, increments user streaks, and resets leaves to 0. Mock competitor scores are shuffled dynamically to keep the leaderboard feeling active.
- **Previous/Simulated Details**: Previously, 29 mock players were created and saved for every user onboarding, bloating the database. The new algorithm uses a shared 30-person pool backfilled with mock users.

---

## 📦 Workspace Package Architecture

The monorepo separates business logic, data models, and presentation interfaces into decoupled modules:

```
footprint/
├── package.json              # Monorepo workspaces manager
├── tsconfig.json             # Root TypeScript configurations
├── apps/
│   ├── api/                  # Express.js REST API Server (PostgreSQL/Prisma)
│   └── web/                  # Vite + React + TypeScript Frontend
└── packages/
    ├── carbon-math/          # GHG Math engine & emission coefficients (Unit Tested)
    └── shared-types/         # Unified TypeScript interfaces
```
