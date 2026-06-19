# 🔌 Third-Party API Integrations

The **Footprint** platform relies on five external integrations to automate carbon footprint calculations, verify lifestyle changes, and manage rewards.

---

## 📊 Integrations Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           FOOTPRINT BACKEND                               │
│  (Ingests webhook payloads, caches intensity factors, updates user points)│
└───────┬───────────────────────────┼───────────────────────────┬───────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ ENERGY / UTILITY│         │   TRANSIT     │           │ EMISSION DATA │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ • Arcadia     │           │ • Radar.io    │           │ • Electricity │
│ • Google Nest │           │   Geofencing  │   *   *   │   Maps        │
│   Smart Home  │           │ • TomTom Map  │           │ • EPA eGRID   │
└───────────────┘           └───────────────┘           └───────────────┘
```

---

## 🔌 API Integration Details

### 1. Arcadia API (Utility & Billing)
- **Purpose**: Automates monthly electricity ($kWh$) and gas ($therms$) consumption tracking.
- **Workflow**:
  - The user links their energy utility account through the Arcadia connect widget.
  - Arcadia queries utility bills and routes billing statements to the Footprint gateway via webhooks.
  - **Endpoint**: `POST /api/webhooks/arcadia`
  - **Payload**:
    ```json
    {
      "userId": "uuid-here",
      "kwh": 485.5
    }
    ```

### 2. Google Nest Device Access API (Smart Home Thermostat)
- **Purpose**: Verifies smart thermostat eco-settings to reward energy savings.
- **Workflow**:
  - Connects securely to the Google Nest Smart Home hub.
  - Monitors HVAC runtime profiles, heating/cooling configurations, and eco-mode status.
  - **Endpoint**: `POST /api/webhooks/nest`
  - **Payload**:
    ```json
    {
      "userId": "uuid-here",
      "hvacMode": "cooling",
      "ecoModeActive": true
    }
    ```

### 3. Radar.io SDK (Transit & Commute)
- **Purpose**: Monitors transit classifications and distance without storing spatial coordinates.
- **Workflow**:
  - The mobile app runs the Radar.io SDK on the device.
  - When transit ends, the SDK processes coordinates locally and sends transport classifications (car, train, walk) and distance to the backend.
  - **Endpoint**: `POST /api/webhooks/radar`
  - **Payload**:
    ```json
    {
      "userId": "uuid-here",
      "distanceMiles": 12.4,
      "mode": "hybrid"
    }
    ```

### 4. Electricity Maps & EPA eGRID (Grid Emissions intelligence)
- **Purpose**: Retrieves localized carbon intensity factors to convert energy usage into $CO_2$ impact.
- **Workflow**:
  - Queries real-time energy generation mixes (solar, wind, coal) across regional grids.
  - Falls back to regional EPA eGRID databases (using zip codes) when real-time data is unavailable.
  - **Caching**: Grid factors are cached in Redis for up to 1 hour to prevent API rate limits.

### 5. Eden Projects (Rewards Fulfillment Webhooks)
- **Purpose**: Triggers real-world tree planting when users redeem leaves.
- **Workflow**:
  - When a user redeems leaves for tree planting, the backend calls the Eden Projects API.
  - Eden Projects processes the transaction and returns a tracking receipt link.
  - **Action**: A transaction voucher is generated and displayed on the user's dashboard.
  - **Previous/Simulated Details**: In the initial simulation, vouchers were created with hardcoded descriptions. The updated implementation executes POST requests to `https://api.edenprojects.org/v1/plantings` (falling back to a realistic simulated receipt URL if `EDEN_API_KEY` is not set).

### 6. Shopify Admin API (Corporate Sponsor Rewards Inventory)
- **Purpose**: Generates and retrieves dynamic discount coupon codes for B-Corp sponsorships.
- **Workflow**:
  - When a user redeems leaves for sponsor-sponsored discounts, the backend calls the Shopify Price Rules & Discount Codes API.
  - Unique codes (e.g., `OATLY-150-XXXXXX`) are dynamically registered inside the vendor Shopify store.
  - **Action**: The user retrieves the coupon code on their dashboard.
  - **Previous/Simulated Details**: Previously, static pre-defined coupon codes (like `OATLY-15-HEX`) were generated locally. The updated implementation interacts with the Shopify REST Price Rule Discount endpoint, falling back to a structured local generator when credentials (`SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_SHOP_NAME`) are not supplied.
