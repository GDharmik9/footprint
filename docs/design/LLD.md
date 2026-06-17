# 💻 Low-Level Design (LLD) - Footprint Implementation

The Low-Level Design defines the code interfaces, database schema variables, formulas, and exact module functions in the Footprint workspace.

---

## 💾 Database Schema Details

Footprint utilizes a dual database interface layer (`database.ts`) that targets **PostgreSQL** in production environments and falls back to a locally structured JSON schema for development.

### 1. `users` Table
Stores user account profiles, gamification rankings, and leaf counts.
```sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    current_level INT DEFAULT 1,
    total_leaves INT DEFAULT 0,
    postal_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `carbon_events` Table
Stores time-series records of registered carbon tracking events.
```sql
CREATE TABLE carbon_events (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,              -- 'housing' | 'transport' | 'food'
    source_provider VARCHAR(50) NOT NULL,       -- 'arcadia' | 'radar_sdk' | 'manual'
    raw_value DOUBLE PRECISION NOT NULL,
    raw_unit VARCHAR(50) NOT NULL,
    computed_co2e_kg DOUBLE PRECISION NOT NULL,
    region_code VARCHAR(20),                    -- e.g. 'US-MROW', 'US-CA', 'IN-WR'
    timestamp TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3. `challenges` Table
Stores 7-day habit challenges, tracking streaks, and daily completion logs.
```sql
CREATE TABLE challenges (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,                 -- 'cold-wash' | 'vampire-hunt'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reward_leaves INT NOT NULL,
    target_days INT NOT NULL,
    current_streak INT DEFAULT 0,
    completed INT DEFAULT 0,
    progress_logs TEXT NOT NULL,                -- JSON stringified array of booleans: e.g., '[false, true, ...]'
    reward_applied INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4. `vouchers` Table
Stores B-Corp sponsor incentives redeemed by users spending leaves.
```sql
CREATE TABLE vouchers (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    sponsor_name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reward_type VARCHAR(50) NOT NULL,           -- 'tree' | 'discount' | 'plug'
    coupon_code VARCHAR(100),
    cost_leaves INT NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 5. `leagues` Table
Stores localized leaderboard standings for the weekly Eco-Leagues environment.
```sql
CREATE TABLE leagues (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),                       -- NULL for simulated mock competitors
    username VARCHAR(100) NOT NULL,
    leaves INT DEFAULT 0,
    level INT DEFAULT 1,
    is_mock INT DEFAULT 1                       -- 1 (True) for generated mock users, 0 for real users
);
```

---

## 🧮 Math Coefficients & Calculations (`packages/carbon-math`)

Methodologies match the Greenhouse Gas (GHG) Protocol:

### Emission Factors Configuration

```typescript
// Grid Intensity Factors (kg CO2e per kWh)
export const GRID_FACTORS: Record<string, number> = {
  'US-MROW': 0.52,  // Coal-Heavy Grid (Midwest)
  'IN-WR': 0.72,    // High Coal Grid (India West)
  'US-CA': 0.22,    // Cleaner Renewables Grid (California)
  'default': 0.38,  // National Average
};

// Transport Factors (kg CO2e per mile)
export const TRANSPORT_FACTORS = {
  suv: 0.40,
  gas_car: 0.30,
  hybrid: 0.18,
  ev: 0.08,
  transit: 0.03, // Public transit, cycling, walking
};

// Dietary Factors (kg CO2e per meal)
export const DIET_FACTORS = {
  meat: 3.0,      // Heavy Meat
  balanced: 1.5,  // Balanced/Poultry
  vegan: 0.5,     // Plant-Forward
};
```

### Calculations Functions

1. **`computeHousingCO2(kwh, option, regionCode)`**:
   $$\text{Emission} = \text{kwh} \times \text{Factor}_{\text{regionCode}}$$
   - If `option === 'smart_thermostat'`: apply $10\%$ reduction.
   - If `option === 'solar'`: apply $85\%$ reduction.

2. **`computeTransportCO2(miles, mode)`**:
   $$\text{Emission} = \text{miles} \times \text{Factor}_{\text{mode}}$$

3. **`computeFoodCO2(meals, dietType)`**:
   $$\text{Emission} = \text{meals} \times \text{Factor}_{\text{dietType}}$$

4. **`computeArchetypeBaseline(options)`**:
   Generates a standard annual baseline footprint (in kg $CO_2e$/year) to initialize the user's trajectory during onboarding:
   - **Housing**: `apartment` (1,800 kg), `townhouse` (4,200 kg), `family` (6,800 kg).
   - **Commute**: `transit` (900 kg), `hybrid` (2,800 kg), `gas` (6,000 kg).
   - **Diet**: `vegan` (900 kg), `balanced` (1,800 kg), `meat` (3,500 kg).

---

## 🔌 API Endpoints Specification (`apps/api`)

| Method | Endpoint | Description | Key Parameters |
|---|---|---|---|
| **POST** | `/api/users` | Onboard user and seed baseline/challenges | `display_name`, `postal_code`, `archetype` object |
| **GET** | `/api/users/:id` | Fetch user info, level, leaves | `id` (User UUID) |
| **GET** | `/api/carbon-events/:userId` | Get carbon event logs for user charts | `userId` (User UUID) |
| **POST** | `/api/carbon-events` | Log manual/automated carbon event | `userId`, `category`, `raw_value`, `raw_unit`, modifiers |
| **GET** | `/api/challenges/:userId` | Retrieve user 7-day challenge streaks | `userId` (User UUID) |
| **POST** | `/api/challenges/progress` | Log daily challenge check-off and award leaves | `userId`, `challengeType`, `dayIndex`, `completed` (boolean) |
| **POST** | `/api/sponsors/redeem` | Spend leaves for B-Corp vouchers | `userId`, `sponsorName`, `rewardType`, `costLeaves` |
| **GET** | `/api/vouchers/:userId` | Fetch redeemed vouchers | `userId` (User UUID) |
| **GET** | `/api/leagues/:userId` | Retrieve competitive league leaderboard | `userId` (User UUID) |
| **POST** | `/api/webhooks/radar` | Ingest transit edge summaries from Radar.io | `userId`, `distanceMiles`, `mode` (or Radar payload) |
| **POST** | `/api/webhooks/arcadia` | Ingest utility billing metrics | `userId`, `kwh` |
| **POST** | `/api/webhooks/nest` | Check smart thermostat Eco-mode status | `userId`, `hvacMode`, `ecoModeActive` |

---

## 🎨 Shared Interfaces Mapping (`packages/shared-types`)

Ensures strict TypeScript compilation across the monorepo:
- **`User`**: Maps database user row.
- **`CarbonEvent`**: Maps database carbon event metrics.
- **`ArchetypeOptions`**: Structures onboarding questionnaire options (`housing`, `diet`, `commute`).
- **`Challenge`**: Structures 7-day habits state (including `progressLogs: boolean[]` for checkboxes status).
- **`Voucher`**: Structures redeemed rewards (`costLeaves`, `couponCode`).
- **`IngestCarbonEventPayload`**: Payload definition for event ingestion.
- **`GCPConfig`**: Config properties for GCP resources (projectId, secrets, pubsub).
