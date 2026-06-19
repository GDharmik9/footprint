# 🌱 Footprint | Micro-Action Carbon Tracker

> Replace environmental guilt with contextual estimation, behavioral psychology, and low-friction habits.

---

## 🚀 System & App Architecture

### High-Level Event-Driven Architecture

```
                                 ┌───────────────────────────────────┐
                                 │       API Gateway (REST/GraphQL)  │
                                 └─────────────────┬─────────────────┘
                                                   │
         ┌─────────────────────────────────────────┼────────────────────────────────────────┐
         ▼                                         ▼                                        ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Ingestion Service (Workers) │          │  Carbon Calculation Engine   │         │  User & Analytics Service    │
│  - Utility APIs (Arcadia)    │          │  - GHG Protocol Formulas     │         │  - Gamification & Streaks    │
│  - Telemetry (Smart Home)    │          │  - Dynamic Grid Factors      │         │  - Virtual Habitat States    │
│  - Commute SDKs (Radar.io)   │          │    (Electricity Maps / eGRID)│         │  - Anonymous Leagues         │
└──────────────┬───────────────┘          └──────────────▲───────────────┘         └──────────────┬───────────────┘
               │                                         │                                        │
               └──────────────────────────┐              │              ┌─────────────────────────┘
                                           ▼              │              ▼
                                     ┌────────────────────┴────────────────────┐
                                     │      Apache Kafka / RabbitMQ Event Bus  │
                                     └────────────────────┬────────────────────┘
                                                          │
                                                          ▼
                                     ┌─────────────────────────────────────────┐
                                     │          Storage Layer                  │
                                     │  - PostgreSQL (Relational/Profiles)     │
                                     │  - TimescaleDB (Time-series metrics)    │
                                     │  - Redis (Regional Factor Caching)      │
                                     └─────────────────────────────────────────┘
```

---

## 📦 Monorepo Workspace Structure

This project is set up as a TypeScript monorepo using **NPM Workspaces**:

```
footprint/
├── package.json         # Monorepo root workspaces manager
├── tsconfig.json        # Shared root TypeScript configuration
├── apps/
│   ├── api/             # Express.js backend API server
│   └── web/             # React + Vite + TypeScript frontend dashboard
└── packages/
    ├── carbon-math/     # GHG calculation engine (equations & coefficients)
    └── shared-types/    # Shared TypeScript Interfaces
```

### 1. `packages/shared-types`
Stores shared TypeScript entities used by both the frontend client and backend API, guaranteeing schema consistency. Defines:
- `User`, `CarbonEvent`, `Challenge`, and `Voucher` interfaces.

### 2. `packages/carbon-math`
Implements the Green House Gas (GHG) Protocol formulas:
- **Housing**: `computeHousingCO2(kwh, option, region)` supports standard, smart thermostat, and solar calculations with grid-specific coefficients.
- **Transport**: `computeTransportCO2(miles, vehicleMode)` computes vehicle transit categories (SUV, gas sedan, hybrid, EV, transit).
- **Diet**: `computeFoodCO2(meals, dietType)` tracks carbon weights for meat-heavy, poultry/balanced, and vegan footprints.
- **Onboarding Baselines**: `computeArchetypeBaseline(archetypeOptions)` generates default profiles for newly onboarding accounts.

### 3. `apps/api`
An Express + SQLite application exposing rest endpoints to track profiles, ingest telemetry, check-off daily habit challenges, and redeemLeaves:
- Exposes:
  - `POST /api/users` - Set up profile and generate initial archetype baselines.
  - `GET /api/users/:id` - Fetch user details, level, and leaf counts.
  - `POST /api/carbon-events` - Ingest manual, Arcadia, or Radar.io telemetry events.
  - `GET /api/challenges/:userId` - Retrieve active 7-day habit streaks.
  - `POST /api/challenges/progress` - Check-off challenge actions and apply Leaf points.
  - `POST /api/sponsors/redeem` - Spend leaves for B-Corp vouchers.

### 4. `apps/web`
A premium dark-themed React + Vite application crafted with custom HSL palettes, Outfit & Inter typography, and micro-interactions:
- **Archetype Form**: Quick visual questionnaire to seed baselines.
- **Simulator**: Dynamically swappable sliders for life changes (Solar, EV, Vegan) projecting changes against original target profiles.
- **Eco-Sphere**: Level-based SVG illustrations evolving visually (leaves, flowers, birches) as the user accumulates points.
- **Rewards Hub**: Redeem Leaves for real-world impact (Oatly vouchers, Smart Plugs, Eden tree plantings).

---

## 🛠️ GCP Services & Architecture

In production, Footprint leverages serverless Google Cloud components to minimize operational overhead and handle asynchronous ingestion streams:

- **Google Cloud API Gateway**: Authenticates incoming telemetry feeds and performs rate-limiting.
- **Cloud Run**: Powers backend Express API microservices, scaling dynamically to zero.
- **Cloud Pub/Sub**: Acts as the central event bus routing utility and transit streams asynchronously.
- **Cloud SQL (PostgreSQL)**: Manages users, gamification structures, and sponsor registries.
- **TimescaleDB on GCE**: Indexes time-series tracking entries for fast, dashboard-ready loads.
- **Memorystore for Redis**: Caches local grid intensity values (e.g. mapping coordinates or Zip codes) to optimize downstream API requests.
- **Secret Manager**: Protects master OAuth credentials, database connections, and third-party tokens.

---

## 🔌 Integration Mapping

The tracking backend aggregates footprints using three third-party API pillars:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           FOOTPRINT BACKEND                               │
└───────┬───────────────────────────┼───────────────────────────┬───────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ ENERGY / UTILITY│         │   TRANSIT     │           │ EMISSION DATA │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ • Arcadia     │           │ • Radar.io    │           │ • Electricity │
│ • Google Nest │           │ • TomTom      │           │   Maps        │
│   Smart Home  │           │   Routing     │           │ • EPA eGRID   │
└───────────────┘           └───────────────┘           └───────────────┘
```

1. **Arcadia API**: Functions like Plaid but for utility billing, feeding monthly $kWh$ and gas therms.
2. **Google Nest API**: Queries smart home HVAC profiles and eco-mode status to verify thermostat challenges.
3. **Radar.io SDK**: Classifies transit categories on the edge (device level) and triggers trip webhook payloads.
4. **Electricity Maps & EPA eGRID**: Serves real-time grid carbon intensities and regional factors.
5. **B-Corp Directory Services**: Verifies corporate sponsors and checks ESG compliance.
6. **Eden Projects Webhooks**: Direct escrow drawdowns to fund tree plantings on user redemptions.

## 💡 Assumptions

- **Edge Computing Validation**: Assumed that the Radar.io SDK cleanly filters invalid transit categories locally before triggering webhooks.
- **Offline Resilience**: Assumed users may experience network drops; simulated sandbox mode fallback ensures continuous footprint estimation.
- **Data Availability**: Assumed grid factor availability from eGRID/ElectricityMaps for all postal codes; fallback to baseline averages is utilized otherwise.

---

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v18+)
- [NPM](https://npmjs.com) (v10+)

### Setup Workspaces
Install the dependencies using `--legacy-peer-deps` to handle React 19 peer dependencies:
```bash
npm install --legacy-peer-deps
```

### Build All Workspaces
Compile TypeScript across all workspaces:
```bash
npm run build
```

### Run Locally
To run the server and client concurrently in development mode:

1. **Start the API Server**:
   ```bash
   npm run dev -w @footprint/api
   ```
   *Runs by default on http://localhost:3001*

2. **Start the Frontend Dashboard**:
   ```bash
   npm run dev -w @footprint/web
   ```
   *Launches Vite on http://localhost:5173 (with local fallback simulation if the API server is off)*

---

## ⚖️ Compliance & Privacy
- **Data Minimization**: No raw spatial data or trip paths are stored on servers. Radar.io SDK calculates distance and classifications on the edge, sending only numerical metrics.
- **Brand Vetting**: Sponsors must be verified Certified B-Corporations or pass audit protocols to fund impact pools.
