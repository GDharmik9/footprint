# 📐 High-Level Design (HLD) - Footprint System

The High-Level Design defines the macro architecture, ingestion pipeline mechanisms, and monorepo workspace separation of the **Footprint** platform.

---

## 🏗️ Overall Event-Driven Architecture

Footprint relies on a serverless event-driven architecture to scale microservices and process data asynchronously. Webhook events (e.g. from utility systems or transit edge trackers) are quickly received by the API, queued, and processed asynchronously via event brokers to minimize latency and improve reliability.

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

## 🔌 Core Ingestion Pipeline Design

To minimize user effort and maximize data accuracy, Footprint automates raw data tracking through three dedicated pipelines:

1. **Utility Bill Ingestion (Arcadia API)**
   - Monthly utility billing files are pulled or received via webhooks.
   - Triggers a background job to extract energy consumption ($kWh$ and gas therms).
   - Translates consumption into $CO_2e$ using localized emission grid factors.

2. **Transit & Commute Tracking (Radar.io SDK)**
   - The user's smartphone coordinates are monitored on-device by the Radar.io SDK.
   - Raw spatial tracking is calculated on the edge. Only transport classifications (e.g. SUV, electric car, walk/transit) and distance metrics are sent to the backend.
   - Webhooks deliver transit summaries which are converted into transport carbon footprint events.

3. **Smart Home Integration (Google Nest Device Access API)**
   - Captures real-time smart thermostat eco-settings, cooling/heating runtime metrics, and ambient temperatures.
   - Automatically rewards users when Eco-Mode is activated during temperature spikes.

---

## 📦 Workspace Package Architecture

The monorepo separates business logic, data models, and presentation interfaces into decoupled modules:

```
footprint/
├── package.json              # Monorepo workspaces manager
├── tsconfig.json             # Root TypeScript compilation configurations
├── apps/
│   ├── api/                  # Express.js REST API Server
│   └── web/                  # Vite + React + TypeScript Frontend
└── packages/
    ├── carbon-math/          # GHG Math engine & emission coefficients
    └── shared-types/         # Unified TypeScript interfaces
```

---

## 🔄 Sequence of Key Workflows

### User Onboarding Flow
1. User interacts with the React Web Archetype Questionnaire.
2. Form submits selection variables (Housing, Diet, Commute profile).
3. The API invokes `@footprint/carbon-math`'s `computeArchetypeBaseline`.
4. The database registers the user, seeds default challenges, and initializes the weekly league environment.
5. Seed data backfills the past 6 months of historical baseline items, providing immediate visual analytics on the user dashboard.

### Carbon Event Ingestion Flow (Via API or Webhooks)
1. Webhook or user logs an activity (e.g. 50 miles driven in a hybrid car).
2. API validates schema structures using `@footprint/shared-types`.
3. In production, the payload is published to Google Cloud Pub/Sub and immediately returns a queuing receipt to the client.
4. The Pub/Sub subscription triggers a subscriber worker that calculates the corresponding $CO_2$ impact and inserts the event in PostgreSQL/TimescaleDB.
5. The system computes eligible Leaf rewards and updates the user's total points and level, reflecting changes dynamically in the Eco-Sphere.
