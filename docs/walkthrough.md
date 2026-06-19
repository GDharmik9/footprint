# Walkthrough: Option D - Personalized AI Climate Coach & Recommendations

This walkthrough summarizes the implementation of **Option D: Reduce & Insights: Personalized AI Climate Coach** and presents the verification results.

## 🔄 Changes Made

### 1. Backend Insights Service (`apps/api`)
- Created [insights.ts](file:///d:/new_era/Hackthon/footprint/apps/api/src/services/insights.ts) to dynamically compute category sums (Transport, Food, Housing) over the past 30 days.
- Automatically generates tailored feedback tips comparing user consumption against baseline baselines.
- Computes highly targeted micro-action recommendations (plant-based meals, transit commute swaps, EV drives, clean solar generation offsets) based on high-impact sectors.

### 2. Secure Route Mounting (`apps/api`)
- Mounted the secure `GET /api/users/:id/insights` route in [server.ts](file:///d:/new_era/Hackthon/footprint/apps/api/src/server.ts) protected by JWT authentication checks.

### 3. Glassmorphic Coach Widget & Actions Hook (`apps/web`)
- Hooked `coachInsights` and `recommendations` states into [App.tsx](file:///d:/new_era/Hackthon/footprint/apps/web/src/App.tsx) fetching baseline analysis on load.
- Designed a glowing emerald-tinted **AI Climate Coach** card displaying coaching tips.
- Configured 1-click interactive action trigger buttons on each recommended micro-action card calling `triggerQuickLog()` directly.
- Implemented robust offline local simulated baseline insights and recommended presets for serverless sandbox testing.

---

## 🧪 Verification & Results

### 1. Automated Tests
- Compiled monorepo production bundle:
  ```bash
  npm run build
  ```
  Result: **Success** with 0 compilation errors across all packages.
- Ran carbon math calculations tests:
  ```bash
  npm run test -w @footprint/carbon-math
  ```
  Result: **Pass** (34 tests successful).

### 2. Manual Verification
The new features were verified locally on the live dashboard:
1. **Coach Feedback Rendering**: Custom energy, diet, and transit tips render cleanly on load.
2. **Interactive Logging**: Clicked the "Log Action" button on the Plant-Based Meal card.
3. **Standings & Feedback**: The toast message was successfully displayed, the total leaves count increased from 10 to 35 leaves, and the manual event immediately appeared in the logs list feed.

### 🎥 Visual Demonstration

Here is a recording demonstrating the features:

![Dashboard AI Climate Coach & Recommendations](/C:/Users/GDhar/.gemini/antigravity-ide/brain/f39aafe6-5777-4cd3-ac83-167ad13f74a0/verify_option_d_1781900278992.webp)

Here are the individual verification screenshots:

````carousel
![AI Climate Coach Card](/C:/Users/GDhar/.gemini/antigravity-ide/brain/f39aafe6-5777-4cd3-ac83-167ad13f74a0/dashboard_scroll_1_1781900291962.png)
<!-- slide -->
![Option C: Category Breakdown Chart](/C:/Users/GDhar/.gemini/antigravity-ide/brain/f39aafe6-5777-4cd3-ac83-167ad13f74a0/breakdown_view_chart_1781899556390.png)
<!-- slide -->
![Option C: Search Logs Filter](/C:/Users/GDhar/.gemini/antigravity-ide/brain/f39aafe6-5777-4cd3-ac83-167ad13f74a0/search_results_hybrid_1781899567728.png)
<!-- slide -->
![Option C: Toast Feedback and Deletion](/C:/Users/GDhar/.gemini/antigravity-ide/brain/f39aafe6-5777-4cd3-ac83-167ad13f74a0/event_deleted_toast_1781899581394.png)
````

---

# Past Walkthrough: Option C - Ingestion History & Logs Management

This walkthrough summarizes the implementation of **Option C: Track | Ingestion History and Trends Graph** and presents the verification results.

## 🔄 Changes Made

### 1. Backend Deletion Route (`apps/api`)
- Implemented `DELETE /api/carbon-events/:id` inside [server.ts](file:///d:/new_era/Hackthon/footprint/apps/api/src/server.ts) to securely delete logged events.
- Recalculates user total leaves and current level.
- Automatically adjusts competitive league standings for the active user.
- Employs dynamic leaf reconstruction factors to compute accurate bonus deductions (EV, transit, vegan diet, solar setup) from event totals.

### 2. Category Breakdown stacked chart toggle (`apps/web`)
- Implemented `chartViewMode` state in [App.tsx](file:///d:/new_era/Hackthon/footprint/apps/web/src/App.tsx) toggling between **Total Trend** (line chart) and **Category Breakdown** (stacked bar chart).
- Built a responsive stacked SVG bar chart renderer displaying Housing, Transport, and Food category segments styled in matching glassmorphic HSL gradients.
- Placed a category breakdown legend at the bottom of the card.

### 3. Recent Activity & Footprint Logs Feed (`apps/web`)
- Added a glassmorphic **Footprint Activity Logs** card below the chart trend card.
- Implemented `getEventDetails()` helper dynamically parsing event categories, sources, and factors to output detailed activity logs.
- Added a real-time reactive search bar to filter logs by description, category, or source.
- Provided a red trashcan button next to each activity log triggering `deleteCarbonEvent()`.
- Built robust local simulation for offline fallback mode ensuring identical user leaf updates and state updates when the cloud backend is disconnected.
