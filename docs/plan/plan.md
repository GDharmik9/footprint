# 📅 Footprint Project Plan & Milestones

This document maps out the roadmap, releases, and development milestones for the **Footprint** platform.

---

## 🗺️ Roadmap Phase Breakdown

### Phase 1: MVP Core (Current State)
- [x] NPM workspaces monorepo structure.
- [x] Custom HSL Glassmorphic theme UI.
- [x] `@footprint/carbon-math` Greenhouse Gas Protocol formulas.
- [x] Express.js API endpoints for user setup, challenge logs, and redemptions.
- [x] SQLite/JSON fallback database for local environments.

### Phase 2: Production GCP Infrastructure (Next Step)
- [ ] Deploy containerized API microservices on Google Cloud Run.
- [ ] Configure Google Cloud API Gateway for route authorization.
- [ ] Set up Google Cloud Pub/Sub queues for asynchronous carbon event tracking.
- [ ] Launch Managed Cloud SQL for PostgreSQL database instance.
- [ ] Deploy Memorystore for Redis for regional grid coefficient caches.
- [ ] Connect production secret keys to GCP Secret Manager.

### Phase 3: Hardware & IoT Integrations
- [ ] Integrate Google Nest Smart Home API for real-time HVAC checking.
- [ ] Incorporate Radar.io geofencing SDK within the mobile client.
- [ ] Ingest utility data files dynamically via Arcadia API integrations.

### Phase 4: Social & Engagement Expansion
- [ ] Add real-time user-to-user competitive leagues.
- [ ] Support monthly Carbon Offset certificates generation.
- [ ] Introduce team-based climate campaigns.
