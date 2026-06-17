# 📆 Daily Development Log

This document tracks daily standup notes, progress, and blockers.

---

## 📅 Today: June 17, 2026

### 🙋 Done:
- [17:41:00] Deployed real competitive Eco-Leagues standings. Refactored the leagues assignment algorithms to dynamically group users into 30-person league pools, populated empty spots with randomized mock competitors within the same league ID, and launched a weekly standings evaluation scheduler to handle rank promotions and score resets.
- [17:35:00] Replaced integration webhooks with live connection endpoints and SDKs. Integrated Radar.io web SDK for browser-based location tracking on transit events, added the Arcadia Connect Connect Widget for OAuth billing credential linking, created a Nest SDM API helper for reading live thermostat states, and secured webhook endpoints with HMAC-SHA256 signature verification.
- [16:56:00] Integrated live grid factors from the Electricity Maps API. Developed a lookup service mapping user postal codes to regional coordinates, cached grid coefficients for 1 hour to prevent API rate limits, and dynamically injected these coefficients into all housing footprint computations.
- [16:44:00] Implemented JWT-based authentication and route security. Wrote auth middleware verifying bearer tokens in Express, signed and returned JWT tokens upon user onboarding, and updated the React client dashboard requests to persist and transmit authorization headers.
- [16:36:00] Configured local PostgreSQL using Docker Compose and migrated the database using Prisma ORM. Refactored the database connection module and Express API routes to use Prisma Client, removing raw queries and the local JSON file fallback.
- [16:22:00] Configured Jest and ts-jest, and wrote comprehensive unit tests verifying the mathematical equations for carbon footprint calculations (housing, transport, food, and archetype baselines) in `@footprint/carbon-math`.
- Created comprehensive documentation files under the `docs` folder:
  - `setup.md` (Local Setup & Run instructions)
  - `HLD.md` (High-Level Design details)
  - `LLD.md` (Low-Level Design and schemas)
  - `SD.md` (GCP System Design details)
  - `web.md` (Frontend client details)
  - `api.md` (Backend API specifications)
  - `third-party-apis.md` (External API configurations)
  - `actors-players.md` (Stakeholders and journeys)
  - `techstack.md` (Technology stack reference sheet)
- Created project management files:
  - `plan.md` (Milestones roadmap)
  - `todo.md` (Backlog action items checklist)

### 🚀 Next Steps:
- Initialize Jest unit tests for the `@footprint/carbon-math` equations.
- Set up Docker configs for local PostgreSQL database verification.

### 🛑 Blockers:
- None.
