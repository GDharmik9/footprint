## Executive Product Brief: Footprint (MVP Blueprint)

**Footprint** is a micro-action carbon tracker engineered to replace environmental guilt with contextual estimation, behavioral psychology, and low-friction habits.

---

## 1. System & App Architecture

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

### Core Ingestion Design

* **Utilities:** Async background cron polling of third-party utility data platforms (e.g., Arcadia API) every month to ingest monthly $kWh$ and gas usage.
* **Transit:** Mobile device client runs the `Radar.io` SDK. Complex telemetry, raw coordinates, and route processing are calculated on the edge (device-level). The app receives an end-of-trip webhook event classifying the transport mode and total distance, then strips out the raw spatial data immediately.
* **Grid Factors:** Cached on a rolling 1-hour expiration via Redis to optimize performance and prevent downstream rate limits on environmental APIs.

### Production Time-Series Database Schema

```sql
-- Core user profiles table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(50) NOT NULL,
    current_level INT DEFAULT 1,
    total_leaves INT DEFAULT 0,
    postal_code VARCHAR(15),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core carbon tracking table using time-series indexing
CREATE TABLE carbon_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,       -- 'transport', 'housing', 'food'
    source_provider VARCHAR(50),         -- 'arcadia', 'radar_sdk', 'manual'
    raw_value NUMERIC NOT NULL,           -- e.g., 45.2, 12.7
    raw_unit VARCHAR(20) NOT NULL,          -- e.g., 'kWh', 'miles'
    computed_co2e_kg NUMERIC NOT NULL,     -- Output calculation result
    region_code VARCHAR(10),              -- e.g., 'US-MROW', 'IN-WR'
    timestamp TIMESTAMPTZ NOT NULL
);

-- Indexes for lightning fast aggregations and dashboard loading
CREATE INDEX idx_user_carbon ON carbon_events (user_id, timestamp DESC);
CREATE INDEX idx_category_carbon ON carbon_events (category);

```

---

## 2. Onboarding & Core App Flow

```
┌─────────────────────────────┐      ┌─────────────────────────────┐      ┌─────────────────────────────┐
│  Phase 1: Quick Archetype   │      │   Phase 2: Opt-In Streams   │      │ Phase 3: The Launchpad      │
│                             │      │                             │      │                             │
│ • Select Housing type       │ ───► │ • Link Smart Home (Nest)    │ ───► │ • Generated Baseline Metric │
│ • Select Commute profile    │      │ • Connect Utility Vendor     │      │ • Unlocked Initial Eco-Plot │
│ • Select Diet baseline      │      │ • Grant Device Transit SDK  │      │ • Suggest First Sprint      │
└─────────────────────────────┘      └─────────────────────────────┘      └─────────────────────────────┘

```

### 90-Second Lifestyle Archetyping UI

The onboarding sequence avoids exhaustive multi-question carbon surveys. It uses a single visual selector form.

* **Housing Grid Options:** [City Apartment (Low Baseline)] | [Suburban Townhouse (Med Baseline)] | [Detached Single Family (High Baseline)]
* **Diet Grid Options:** [Plant-Forward / Vegan] | [Balanced / Poultry] | [Meat-Heavy / Beef Enthusiast]
* **Commute Grid Options:** [Public Transit / Bike] | [Hybrid/EV Vehicle] | [Standard Gas Car / SUV]

*System Action:* Upon submission, these selections apply a localized static calculation array that estimates the user's initial baseline within $\pm15\%$ accuracy, launching the application state directly into the interactive dashboard.

---

## 3. Core App Dashboard & Simulator

The operational core of the app maps the user's progress through a real-time behavioral simulator. Users can interactively model life changes across **Housing**, **Transport**, and **Food** to observe how small swaps compound dynamically over a year.

```
+--------------------------------------------------------+
|                     F O O T P R I N T                  |
+--------------------------------------------------------+
|  MY ANNUAL TRAJECTORY:                   15.0 Tons/Yr  |
|  [████████████████████░░░░░░░░░░] Target: 10.0 Tons     |
+--------------------------------------------------------+
|                                                        |
|  1. HOUSING IMPACT                                     |
|  ( ) Standard Grid     (X) Smart Thermostat  ( ) Solar |
|  [████████████░░░░░░░░░░░░░░░░░] 4.8 Tons/Yr           |
|                                                        |
|  2. TRANSPORT SIMULATOR                                |
|  (X) Drive SUV Daily   ( ) Hybrid/EV Swap   ( ) Transit |
|  [████████████████████████░░░░░] 6.2 Tons/Yr           |
|                                                        |
|  3. DIETARY CHOICES                                    |
|  ( ) Heavy Meat        (X) Low Beef Diet    ( ) Vegan   |
|  [██████████░░░░░░░░░░░░░░░░░░] 4.0 Tons/Yr           |
|                                                        |
+--------------------------------------------------------+
|  PROJECTED LIFETIME REDUCTION:                  -2.1 T |
|  [ UNLOCK SIMULATED HABIT CHALLENGE ]                  |
+--------------------------------------------------------+

```

---

## 4. Gamification, 7-Day Challenges & UX Copy

### The Engagement Loop

To prevent user abandonment, the app leverages local habit rewards without financial payouts:

* **Leaves (XP):** Earned by tracking low-carbon actions. Used to level up a personalized visual "Eco-Sphere" dashboard canvas.
* **Eco-Leagues:** Users are grouped into localized, anonymous 30-person weekly leaderboards to build momentum through friendly competition.

### Challenge Wireframe 1: "The Cold-Wash Campaign"

* **Goal:** Run all laundry washes using cold water settings for 7 consecutive days.

#### Phase 1: Contextual Invite (Trigger: Sunday Night, 7:30 PM)

* **Push Notification:**
> **Title:** Open for a 7-day experiment? 🧺
> **Body:** Flip the dial to cold for your laundry this week. It saves your clothes, cuts your hot water bill, and earns you 100 Leaves. Tap to accept!


* **In-App Acceptance View Card:**
```
+---------------------------------------------------------+
|               TURN DOWN THE HEAT                        |
+---------------------------------------------------------+
| About 75% to 90% of the energy your washing machine     |
| uses goes entirely toward heating the water.            |
|                                                         |
| Switching to cold settings blocks fabric shrinkage      |
| and color bleeding while cutting emissions.             |
+---------------------------------------------------------+
|                 [ I'M IN - START TASK ]                 |
+---------------------------------------------------------+

```



```

#### Phase 2: Midpoint Verification (Trigger: Wednesday, 4:00 PM)
*   **Push Notification:**
    > **Title:** Halfway through the Cold-Wash! 🧊
    > 
    > **Body:** Your heating element has taken a 3-day nap. Log your mid-week load to keep your savings streak alive!

#### Phase 3: Streak Protector Trigger (Trigger: Saturday, 10:00 AM)
*   **Push Notification:**
    > **Title:** One final spin 🌍
    > 
    > **Body:** You are just one cold load away from completing the challenge. Don't let your 6-day streak cool off now!

#### Phase 4: Celebration Payloads (Trigger: Completion State Webhook)
*   **In-App Completion Dialog Card:**
    ```
    +---------------------------------------------------------+
    |            CHALLENGE SUCCESS: COLD WASHED!              |
    +---------------------------------------------------------+
    |  - CARBON AVOIDED:     4.2 Kilograms                    |
    |  - VALUABLE METRIC:    Equivalent to 510 phone charges  |
    |  - CASH EQUIVALIVALENT: ~$3.50 saved on electricity     |
    +---------------------------------------------------------+
    |  REWARD APPLIED: +100 LEAVES                            |
    |  [ GROW MY ECO-SPHERE HABITAT ]                         |
    +---------------------------------------------------------+

```

---

### Challenge Wireframe 2: "The Vampire Hunt"

* **Goal:** Disconnect 3 standby home electronics (consoles, idle chargers, secondary displays) before sleeping for 7 consecutive days.

#### Phase 1: Contextual Invite (Trigger: Sunday Night, 8:30 PM)

* **Push Notification:**
> **Title:** Ready for a Vampire Hunt tonight? 🧛‍♂️
> **Body:** Idle electronics quietly drain up to 10% of your home's electricity while you sleep. Unplug just 3 tonight to start the challenge.


* **In-App Acceptance View Card:**
```
+---------------------------------------------------------+
|               SLAY STANDBY PHANTOM LOADS                |
+---------------------------------------------------------+
| Devices like gaming consoles, media setups, and smart    |
| displays draw "phantom loads" even when turned off.     |
| Pulling the plug blocks this invisible energy leak.    |
+---------------------------------------------------------+
|                   [ BEGIN THE HUNT ]                    |
+---------------------------------------------------------+

```



```

#### Phase 2: System Reminders (Trigger: Thursday, 10:15 PM)
*   **Push Notification:**
    > **Title:** Quick check before lights out 🔌
    > 
    > **Body:** Laptop charger? Coffee maker? Game console? Take 30 seconds to unplug your 3 vampire targets before sleep.

#### Phase 3: Celebration Payloads (Trigger: Completion State Webhook)
*   **In-App Completion Dialog Card:**
    ```
    +---------------------------------------------------------+
    |               VAMPIRES DEFEATED! 🛡️                      |
    +---------------------------------------------------------+
    |  - RAW ENERGY SAVED:   2.8 kWh of phantom load blocked  |
    |  - TRACKING BONUS:     +120 Leaves Added                |
    +---------------------------------------------------------+
    |  HABITAT UPGRADE:                                       |
    |  Your virtual Eco-Sphere just grew a new Silver Birch   |
    +---------------------------------------------------------+
    |              [ VIEW EVOLVED ECO-SPHERE ]                |
    +---------------------------------------------------------+

```

---

## 5. B-Corp Corporate Sponsorship & Rewards Integration

### The Capital Distribution Loop

Sponsorship budgets are converted directly into interactive customer acquisition and retention tools. This model avoids out-of-pocket reward costs for the app.

```
┌──────────────────────────────────────┐
│  B-Corp Corporate Sustainability Hub │
│  Deposits $10,000 into Escrow Pool  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  App User Redeems 5,000 Leaves Point  │
│  Triggers Automated $1.00 Drawdown   │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ Verified Global Non-Profit Projects  │
│ Receives $1.00 to plant 1 tree       │
└──────────────────────────────────────┘

```

### Contextual Ad Placement Strategy & In-App UI Flows

Sponsors are showcased at moments of high user achievement, completely separating the app from traditional intrusive ad banners.

#### Placement View 1: Home Utility Context

* **Trigger Event:** Completion of "The Cold-Wash Campaign" or "The Vampire Hunt."
* **Screen Presentation UI:**
```

```



+---------------------------------------------------------+
|                 COLLECTIVE IMPACT EVENT                 |
+---------------------------------------------------------+
| This weekly tracker milestone was fully supported and    |
| funded by ARCADIA ENERGY.                               |
|                                                         |
| Ready to take automation further? Link your real utility |
| billing setup to Footprint via Arcadia and receive a    |
| complimentary Smart Energy Plug directly to your door.  |
+---------------------------------------------------------+
|              [ OPT-IN AND LINK ACCOUNTS ]               |
+---------------------------------------------------------+

```

#### Placement View 2: Sustainable Consumer Products Context
*   **Trigger Event:** User completes 5 consecutive entries tracking a plant-based food swap.
*   **Screen Presentation UI:**
    ```
    +---------------------------------------------------------+
    |                 MILESTONE CONGRATULATIONS               |
    +---------------------------------------------------------+
    | Your consistent daily food choices just unlocked a real-  |
    | world impact milestone funded by OATLY.                 |
    |                                                         |
    | 1 Physical Tree has been planted via Eden Projects.      |
    | As an extra thank you, here is an Oatly brand voucher:  |
    |                                                         |
    | BARCODE: [ |||||||||||||||||||| ] 15% OFF AT CHECKOUT   |
    +---------------------------------------------------------+
    |               [ SAVE VOUCHER TO WALLET ]                |
    +---------------------------------------------------------+

```

### Compliance, Auditing, & Privacy Safeguards

* **Data Minimization:** No personal data or identifiable tracking records are ever shared with corporate partners. Partners receive aggregate statistics for their ESG reporting portal (e.g., *"Your campaign sponsored 12,000 completed user actions, reducing 15.4 Metric Tons of CO2e this quarter"*).
* **Brand Vetting Protocol:** Prospective sponsors must be verified **Certified B-Corporations**, maintain high independent ESG evaluations, or pass an internal supply-chain audit before funding an impact pool. This protects user trust and ensures the platform remains free from greenwashing.