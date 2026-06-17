# ☁️ System Design (SD) & GCP Architecture

This document details the production cloud topology, storage layer selection, and security practices deployed on the **Google Cloud Platform (GCP)** to host the **Footprint** platform.

---

## 🏛️ GCP Infrastructure Architecture Diagram

The production layout leverages fully serverless services for computing, messaging queues, caching, and security:

```
                            [ Client Web/Mobile App ]
                                        │
                                        ▼ (HTTPS)
                         [ Google Cloud API Gateway ]
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼ (JSON)                       ▼ (REST API)                   ▼ (JSON)
 [ Ingestion Service ]           [ User/Rewards Service ]       [ Analytics Service ]
     (Cloud Run)                      (Cloud Run)                   (Cloud Run)
         │                                      │                        │
         ▼ (Publish event)                      └───────────┬────────────┘
   [ Cloud Pub/Sub ]                                        │
         │                                                  │
         ▼ (Trigger event)                                  ▼ (Queries)
[ Calculation Engine Worker ] ──(Cache lookup)──► [ Memorystore for Redis ]
         │                                                  │
         ▼ (Write SQL)                                      ▼ (Fetch factors)
  [ Cloud SQL (Postgre) ]                       [ Real-time Grid Factor APIs ]
         │
         ▼ (Analytics logs replication)
  [ TimescaleDB on GCE ]
```

---

## 🛠️ GCP Services Breakdown

### 1. Compute Layer: Cloud Run
- **Service Hosting**: Microservices (Ingestion, Core API, Rewards Worker) are packaged into lightweight Docker containers.
- **Auto-scaling**: Configured to scale dynamically from `0` up to `N` instances. This minimizes costs when inactive and scales up automatically during user push-notification campaigns.
- **Resource Constraints**: Default instances run with 512MB RAM / 1 vCPU to minimize deployment overhead.

### 2. Message Bus & Workers: Cloud Pub/Sub
- **Decoupling**: Used as the primary asynchronous message broker between the raw ingestion gateways and the carbon footprint database.
- **Throughput**: Telemetry events from transit SDKs and utilities publish payloads to a topic (`carbon-events-ingest`).
- **Processing**: A Cloud Run background worker processes events sequentially from the subscription pool, preventing database load spikes.

### 3. Caching Layer: Memorystore for Redis
- **Emission Factor Caching**: Real-time grid intensities (e.g. from Electricity Maps API) change hourly. To avoid API rate-limit limits and keep database query speeds fast, regional factors are cached in Redis for up to 1 hour.
- **Fast Latency**: Cuts average computation lookup latencies to under 3ms.

### 4. Database Layer: Cloud SQL & TimescaleDB
- **Cloud SQL for PostgreSQL**: Manages relational entities such as user credentials, levels, reward logs, streaks, and B-Corp partners.
- **TimescaleDB on Compute Engine**: Acts as the time-series datastore, optimized for fast range queries and roll-up aggregations of historical carbon footprints over weeks, months, or years.

### 5. Security: Secret Manager
- **Credentials Defense**: Encrypts and stores third-party API credentials (Arcadia, Nest, Radar.io keys) and database URLs.
- **Runtime Access**: Injected into the container's environment variables at runtime via IAM service accounts, preventing hardcoded credentials.

---

## 🔒 Security & Privacy Engineering

- **Data Minimization**: Location tracking is handled locally on the mobile client (via Radar.io SDK). The backend never stores coordinates or trip routes, recording only transit mode and distance.
- **OAuth Integration**: Integrates Google Nest Device Access through a secure authorization server, storing tokens in GCP Secret Manager.
- **B-Corp Vetting**: Dynamic checks occur to ensure corporate vouchers originate exclusively from active B-Corp certified sponsors.
