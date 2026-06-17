# 💻 Technology Stack Reference

This document serves as a quick reference for all technologies, programming languages, runtimes, database layers, and third-party APIs used in the **Footprint** monorepo project.

---

## 💻 Local Development & Workspace Architecture

- **Monorepo Package Manager**: **NPM Workspaces** (v10+)
- **Programming Language**: **TypeScript** (v5.3+) — strict compilation boundaries.
- **Build Tooling & Bundler**: **Vite** (v5.1+) — supports fast HMR for frontend development.
- **Process Orchestration**: **`concurrently`** (v8.2) — starts both API and web UI apps concurrently with a single command.
- **Hot Reloading / Restarting**: **`tsc-watch`** (v6.2+) — automatically rebuilds backend source files and restarts the server on change.

---

## 🎨 Frontend Client Application (`apps/web`)

- **Core UI Library**: **React** (v19.0) — handles dashboard rendering and questionnaire states.
- **Visual styling & Icons**: 
  - **Vanilla CSS** + custom **HSL color variables** for glassmorphism panels.
  - **Lucide React** (v0.344) — provides modern SVG UI icons.
- **Fonts & Typography**: 
  - **Outfit**: Google Display Font (used for numbers, values, and large headers).
  - **Inter**: Google UI Font (used for general text and settings).
- **Eco-Sphere Graphics**: Native **SVG Components** programmatically responding to user leaf levels.
- **Data Strategy & Network**: **Fetch API** — supports backend client queries with automatic offline fallbacks to simulate local states.

---

## ⚙️ Backend Core API & Package Engines (`apps/api` & `packages/`)

- **Runtime Environment**: **Node.js** (v18+)
- **Server Framework**: **Express.js** (v4.19) — handles REST endpoints, middleware routing, and webhook ingestion.
- **Calculation Core**: **`@footprint/carbon-math`** (local workspace package) — evaluates GHG Protocol equations.
- **Shared Types System**: **`@footprint/shared-types`** (local workspace package) — coordinates structural type definitions.
- **Cross-Origin Requests**: **`cors`** middleware.

---

## 💾 Databases & Caching

- **Production Relational Database**: **Google Cloud SQL for PostgreSQL** (v15+) — houses profiles, challenges, and sponsor logs.
- **Development Relational Database**: Zero-dependency **JSON file fallback** (`footprint_dev_db.json`) — coordinates database queries offline.
- **Time-Series Ingestion**: **TimescaleDB on Compute Engine** (or Bigtable) — logs historical carbon trajectories.
- **High-Speed Caching**: **Memorystore for Redis** — caches regional electrical grid carbon coefficients (1-hour expiration).

---

## ☁️ Enterprise Production Google Cloud (GCP) Services

- **Compute Runtime**: **Cloud Run** — hosts API and calculation worker containers (scales down to zero).
- **Asynchronous Ingestion Bus**: **Cloud Pub/Sub** — handles transit and utility billing webhook queues.
- **Task Queues & Cron Services**: **Cloud Tasks** (rate-limiting) and **Cloud Scheduler** (daily streaks evaluation and leaderboard resets).
- **Security & Key Vault**: **Secret Manager** — protects OAuth tokens and database connection strings.
- **Routing & Gatekeeping**: **Google Cloud API Gateway** — routes and validates API requests.

---

## 🔌 Third-Party APIs & Integration Points

- **Arcadia API**: Plaid-like connection to ingest monthly $kWh$ and gas therms metrics.
- **Google Nest API**: Queries smart thermostats runtime parameters and Eco-mode status.
- **Radar.io SDK**: Mobile geo-tracking library classifying transit modes on the edge.
- **Electricity Maps & EPA eGRID APIs**: Serves regional carbon intensity factors.
- **Eden Projects API**: Automated webhooks to fund tree planting when leaves are redeemed.
