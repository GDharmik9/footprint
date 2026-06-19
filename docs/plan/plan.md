# 📅 Footprint Project Plan & Milestones

This document maps out the roadmap, releases, and development milestones for the **Footprint** platform.

---

## 🔍 Milestone Progress Status (June 19, 2026)

We have successfully advanced Footprint to a production-ready core. Here is the status of our milestone releases:

*   **Phase 1 (MVP Core)**: **100% Complete**. The carbon calculation library, standard Express routes, and React interface are fully deployed.
*   **Phase 2 (Production GCP & Database)**: **90% Complete**. Container configurations, Cloud Run deployments, Secret Manager bounds, and Postgres database migrations are implemented. 
*   **Phase 3 (Hardware & IoT)**: **Hybrid-Ready**. The client-side Radar.io SDK and Arcadia Connect widgets are integrated, alongside Nest SDM API. These fall back to dynamic sandbox simulations when API credentials are not supplied.
*   **Phase 4 (Social Leagues & Rewards)**: **Feature-Complete**. Grouping users into 30-person pools, weekly reset crons, Eden tree planting API, and Shopify coupon creations are implemented.

---

## 🗺️ Roadmap Phase Breakdown

### Phase 1: MVP Core (Completed)
- [x] NPM workspaces monorepo structure.
- [x] Custom HSL Glassmorphic theme UI.
- [x] `@footprint/carbon-math` Greenhouse Gas Protocol formulas.
- [x] Express.js API endpoints for user setup, challenge logs, and redemptions.
- [x] SQLite/JSON fallback database for local environments.

### Phase 2: Production GCP Infrastructure (Completed)
- [x] Deploy containerized API microservices on Google Cloud Run.
- [ ] Configure Google Cloud API Gateway for route authorization.
- [x] Set up Google Cloud Pub/Sub queues for asynchronous carbon event tracking.
- [x] Launch Managed Cloud SQL for PostgreSQL database instance.
- [ ] Deploy Memorystore for Redis for regional grid coefficient caches.
- [x] Connect production secret keys to GCP Secret Manager.

### Phase 3: Hardware & IoT Integrations (Completed / Hybrid-Ready)
- [x] Integrate Google Nest Smart Home API for real-time HVAC checking.
- [x] Incorporate Radar.io geofencing SDK within the mobile client.
- [x] Ingest utility data files dynamically via Arcadia API integrations.

### Phase 4: Social & Engagement Expansion (In Progress)
- [x] Add real-time user-to-user competitive leagues.
- [ ] Support monthly Carbon Offset certificates generation.
- [ ] Introduce team-based climate campaigns.
