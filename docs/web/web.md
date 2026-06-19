# 🎨 Frontend Web Application (`apps/web`)

This document provides detailed documentation for the **Footprint** client application—a React, Vite, and TypeScript dashboard featuring custom HSL styling, micro-animations, JWT state authorization, and third-party frontend SDK integrations.

---

## 📂 Code Structure & Organization

The frontend codebase is located under [`apps/web`](file:///d:/new_era/Hackthon/footprint/apps/web):
- **`src/main.tsx`**: Entry point bootstrapping React into the browser.
- **`src/App.tsx`**: Holds the core state, navigation, form inputs, simulator sliders, dashboard views, and HTTP client requests.
- **`src/App.css`**: Styling directives, including Glassmorphism panels, HSL color tokens, animations, and typography configurations.
- **`src/index.css`**: Global CSS rules and baseline layout configurations.

---

## 🎨 HSL Design System & Theme

To project a premium, state-of-the-art aesthetic, the app implements a custom HSL dark theme with smooth gradients, cards, and transitions:

```css
:root {
  /* Premium Dark Theme HSL Coordinates */
  --bg-base: 220 20% 8%;         /* Dark navy charcoal */
  --bg-surface: 220 20% 12%;      /* Lighter card backgrounds */
  --border-glow: 142 70% 40% / 0.15; /* Soft emerald neon aura */
  
  /* Primary Hues */
  --leaf-green: 142 76% 36%;     /* Energetic emerald */
  --leaf-light: 142 76% 50%;
  
  /* Typography HSL coordinates */
  --text-primary: 210 20% 98%;   /* Bright ice-white */
  --text-secondary: 215 15% 75%; /* Warm grey */
}
```

### Typography Settings
- **Display Typography**: **Outfit** from Google Fonts (used for metrics, titles, and headers for high-impact visual quality).
- **Body / Interface Typography**: **Inter** (ensures clean legibility on tabular data, buttons, and user streak components).

---

## 🧱 Primary Dashboard Components & Integrations

### 1. 90-Second Lifestyle Archetype Questionnaire
- **Selections**:
  - **Housing**: `City Apartment` | `Suburban Townhouse` | `Single Family Home`
  - **Diet**: `Vegan/Plant-Forward` | `Balanced/Poultry` | `Meat-Heavy/Beef`
  - **Commute**: `Transit/Bike` | `Hybrid/EV` | `Gas Vehicle/SUV`
- **Action**: Generates a standard baseline metric using `@footprint/carbon-math`'s baseline parameters.

### 2. Live Frontend Connections & SDKs (New)
- **Radar.io SDK**:
  - Initialized on application mount.
  - When transit events are logged, the client calls `Radar.trackOnce()` to dynamically fetch location telemetry before registering the activity.
- **Arcadia Connect Widget**:
  - Loads the Arcadia OAuth connect script dynamically.
  - Renders the utility billing connection portal within the client dashboard.
- **Session Security (JWT)**:
  - On onboarding, the client receives a signed token which it persists in `localStorage` under `footprint_auth_token`.
  - Attaches `Authorization: Bearer <token>` to all subsequent request headers targeting secured backend paths.
- **Previous/Simulated Details**: In the initial prototype, webhooks and integrations were simulated using local browser events. Endpoints trusted client-provided user IDs without token validation or HMAC signatures.

### 3. Micro-Action Carbon Simulator
- **Interactive UI**: Users adjust sliders or click swap toggles (e.g. standard grid vs solar panels, gas car vs EV, vegan meal swaps) to simulate a reduction trajectory.
- **Real-Time Projection**: Calculates real-time carbon reduction estimates and updates chart bars.

### 4. Evolving SVG Eco-Sphere
- **Design**: A clean vector sphere that evolves visually as the user accumulates Leaves (XP).
- **Levels Evolving Loop**:
  - **Level 1**: Echos a single soil plot with a small sprout.
  - **Level 2**: Sprout grows into leafy stems.
  - **Level 3**: Evolves into a young birch tree.
  - **Level 4**: Resembles a mature tree.
  - **Level 5+**: Adds animated floating leaves and flowers to reflect high achievements.

### 5. Rewards Hub
- **Redemption Cards**:
  - **15% Off Oatly Milk Voucher** (Cost: 150 Leaves)
  - **Complimentary Arcadia Smart Plug** (Cost: 500 Leaves)
  - **Eden Projects Tree Planting** (Cost: 100 Leaves)
- **Fulfillment**: Displays tree-planting receipts or dynamic coupon codes returned from active API requests.

---

## 🔌 API Client & Local Simulation Fallback

To support development when the backend API is offline:
- If the application cannot connect to the backend server (`localhost:3001`), it displays a warning banner and falls back to a **Local Simulation Mode**.
- In local simulation mode, all CRUD operations are processed in the browser's state, allowing design reviews and questionnaire flows to run offline.
