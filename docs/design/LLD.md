# 💻 Low-Level Design (LLD) - Footprint Implementation

The Low-Level Design defines the database schema, code interfaces, formulas, and exact module functions in the Footprint workspace.

---

## 💾 Database Schema Details (Prisma PostgreSQL)

Footprint uses **Prisma ORM** in production and development to interact with a **PostgreSQL** database. 

### 1. `User` Model (`users` table)
Stores user account profiles, gamification level, and leaves.
```prisma
model User {
  id           String        @id
  displayName  String        @map("display_name")
  currentLevel Int           @default(1) @map("current_level")
  totalLeaves  Int           @default(0) @map("total_leaves")
  postalCode   String?       @map("postal_code")
  createdAt    DateTime      @default(now()) @map("created_at")
  carbonEvents CarbonEvent[]
  challenges   Challenge[]
  vouchers     Voucher[]
}
```

### 2. `CarbonEvent` Model (`carbon_events` table)
Stores time-series records of registered carbon tracking events.
```prisma
model CarbonEvent {
  id             String   @id
  userId         String   @map("user_id")
  category       String   // 'housing' | 'transport' | 'food'
  sourceProvider String   @map("source_provider") // 'arcadia' | 'radar_sdk' | 'manual'
  rawValue       Float    @map("raw_value")
  rawUnit        String   @map("raw_unit")
  computedCO2eKg Float    @map("computed_co2e_kg")
  regionCode     String?  @map("region_code") // e.g. 'US-MROW', 'US-CA', 'IN-WR'
  timestamp      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 3. `Challenge` Model (`challenges` table)
Stores 7-day habit challenges, tracking streaks, and daily completion logs.
```prisma
model Challenge {
  id            String   @id
  userId        String   @map("user_id")
  type          String   // 'cold-wash' | 'vampire-hunt'
  title         String
  description   String
  rewardLeaves  Int      @map("reward_leaves")
  targetDays    Int      @map("target_days")
  currentStreak Int      @default(0) @map("current_streak")
  completed     Int      @default(0) // 0 (False), 1 (True)
  progressLogs  String   @map("progress_logs") // JSON stringified array of booleans: e.g. '[false, true, ...]'
  rewardApplied Int      @default(0) @map("reward_applied")
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at")
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 4. `Voucher` Model (`vouchers` table)
Stores B-Corp sponsor incentives redeemed by users spending leaves.
```prisma
model Voucher {
  id          String   @id
  userId      String   @map("user_id")
  sponsorName String   @map("sponsor_name")
  title       String
  description String
  rewardType  String   @map("reward_type") // 'tree' | 'discount' | 'plug'
  couponCode  String?  @map("coupon_code") // Dynamic coupon or Eden tracking link
  costLeaves  Int      @map("cost_leaves")
  redeemedAt  DateTime @default(now()) @map("redeemed_at")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 5. `League` Model (`leagues` table)
Stores localized leaderboard standings. real users share `leagueId` pools of 30.
```prisma
model League {
  id       String  @id
  leagueId String  @map("league_id") // Grouping ID for 30-person pools
  userId   String? @map("user_id")   // Null for mock competitors
  username String
  leaves   Int     @default(0)
  level    Int     @default(1)
  isMock   Int     @default(1) @map("is_mock") // 1 (True) for generated mock users, 0 for real users
}
```

- **Previous/Simulated Details**: In the initial design, tables were simulated via raw memory objects. Real users were assigned individual leagues with 29 generated mock users tied uniquely to their userId. Pushing schema updates is now synchronized using Prisma.

---

## 🧮 Math Coefficients & Calculations (`packages/carbon-math`)

Calculations follow the Greenhouse Gas (GHG) Protocol:
- **`computeHousingCO2(kwh, option, regionCode)`**: Calculations apply regional intensity coefficients (e.g. from Electricity Maps) with modifiers for smart thermostats (10% savings) and solar panels (85% savings).
- **`computeTransportCO2(miles, mode)`**: Calculates mileage coefficients based on mode (SUV, EV, Hybrid, public transit).
- **`computeFoodCO2(meals, dietType)`**: Standardized food footprint (Meat, Vegan, Balanced).
- **`computeArchetypeBaseline(options)`**: Standard baseline initialized on user onboarding to populate charts.

---

## 🔌 API Endpoints Specification (`apps/api`)

| Method | Endpoint | Authenticated | Description | Key Parameters |
|---|---|---|---|---|
| **POST** | `/api/users` | No | Onboard user, return onboarding JWT | `display_name`, `postal_code`, `archetype` |
| **GET** | `/api/users/:id` | Yes (JWT) | Fetch user info, level, leaves | `id` (User UUID) |
| **GET** | `/api/carbon-events/:userId` | Yes (JWT) | Get carbon event logs for user charts | `userId` (User UUID) |
| **POST** | `/api/carbon-events` | Yes (JWT) | Log manual/automated carbon event | `category`, `raw_value`, `raw_unit`, modifiers |
| **GET** | `/api/challenges/:userId` | Yes (JWT) | Retrieve user 7-day challenge streaks | `userId` (User UUID) |
| **POST** | `/api/challenges/progress` | Yes (JWT) | Log daily challenge check-off | `challengeType`, `dayIndex`, `completed` |
| **POST** | `/api/sponsors/redeem` | Yes (JWT) | Spend leaves for B-Corp vouchers | `sponsorName`, `rewardType`, `costLeaves` |
| **GET** | `/api/vouchers/:userId` | Yes (JWT) | Fetch redeemed vouchers | `userId` (User UUID) |
| **GET** | `/api/leagues/:userId` | Yes (JWT) | Retrieve user's competitive league leaderboard | `userId` (User UUID) |
| **POST** | `/api/webhooks/radar` | HMAC Verified | Ingest transit edge summaries from Radar.io | `userId`, `distanceMiles`, `mode` |
| **POST** | `/api/webhooks/arcadia` | HMAC Verified | Ingest utility billing metrics | `userId`, `kwh` |
| **POST** | `/api/webhooks/nest` | No | Check smart thermostat Eco-mode status | `userId`, `hvacMode`, `ecoModeActive` |

---

## 🎨 Shared Interfaces Mapping (`packages/shared-types`)

Strict TypeScript types across the monorepo:
- **`User`**: Maps database user row.
- **`CarbonEvent`**: Maps database carbon event metrics.
- **`Challenge`**: Structures 7-day habits state (including `progressLogs: boolean[]` for checkboxes status).
- **`Voucher`**: Structures redeemed rewards (`costLeaves`, `couponCode`).
- **`IngestCarbonEventPayload`**: Payload definition for event ingestion.
- **`GCPConfig`**: Config properties for GCP resources (projectId, secrets, pubsub).
