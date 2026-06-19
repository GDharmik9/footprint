# 🎯 Project Alignment Plan (projectAlign.md)

This document evaluates the alignment of the **Footprint** platform with the primary problem statement and proposes concrete enhancements to achieve a **100/100 Problem Statement Alignment score** (currently **94/100**).

---

## 🔍 Problem Statement Analysis
> "Design a solution that helps individuals **understand**, **track**, and **reduce** their carbon footprint through **simple actions** and **personalized insights**."

The problem statement identifies five core pillars:
1. **Understand**: Visualizing and demystifying carbon footprints.
2. **Track**: Low-friction data capture of everyday activities.
3. **Reduce**: Encouraging positive climate action and habits.
4. **Simple Actions**: Micro-habits and one-click trackers.
5. **Personalized Insights**: Tailored data feedback, suggestions, and recommendations.

Below is an assessment of the current features and the proposed additions to maximize alignment.

---

## 📊 Alignment Matrix & Action Items

| Pillar | Current Feature Set (94% Align) | Proposed Score-Elevation Features (100% Target) |
| :--- | :--- | :--- |
| **Understand** | Archetype-based baseline calculator, glassmorphic sliders for simulated lifestyle modifications (Solar, EV, Vegan) against baselines. | **[x] Complete**: Added `getCarbonEquivalentsDescription` translating kg CO2e metrics into real-world comparisons. |
| **Track** | Telemetry ingestion webhooks (Radar.io location, Arcadia billing files, Nest thermostats), manual logs, and historical baseline generator. | **[x] Complete**: Added category breakdown stacked bar chart toggle and interactive Footprint Activity Logs feed with search/delete capabilities. |
| **Reduce** | 7-day habit streaks (🧺 cold wash laundry, 🧛 standby power vampires), and Leaf points redemptions for certified B-Corp vouchers. | **[x] Complete**: Added dynamic micro-task recommendations based on user telemetry that users can accept and log in one-click. |
| **Simple Actions** | Structured logging forms and daily challenge checkboxes. | **[x] Complete**: Added a "1-Click Quick Tracker" dashboard widget for instant logging of common green actions. |
| **Personalized Insights** | Baseline archetypes comparisons. | **[x] Complete**: Added AI Climate Coach card providing user telemetry-based analysis, motivational tips, and interactive suggestions. |
| **Frictionless Onload** | Blocked dashboard with multi-step questionnaire form. | **[x] Complete**: Auto-detects location via background GeoIP lookup, assigns a random eco name, and seeds baseline options to land instantly on dashboard on first load. Progressive calibration checklist is shown non-intrusively. |

---

## 🛠️ Step-by-Step Implementation Roadmap

### 1. [x] Complete | Simple Actions: One-Click Quick Logging
- **Goal**: Minimize entry friction to promote habitual tracking.
- **Action**: Added a "Quick Action Panel" to the dashboard frontend allowing users to click predefined green buttons to instantly log vegan meals, walking commutes, or solar power activity.
- **Backend support**: Preset carbon weights from `@footprint/carbon-math` processed on demand.

### 2. [x] Complete | Understand: Contextual Carbon Equivalency Metrics
- **Goal**: Make emission values relatable.
- **Action**: Mapped computed $kg\ CO_2e$ to physical equivalents (trees, smartphone charges, driving miles) under the trajectory and trend chart cards.
- **Backend support**: Implemented helper functions in `@footprint/carbon-math`.

### 3. [x] Complete | Track: Ingestion History and Trends Graph
- **Goal**: Provide historical transparency and show trends.
- **Action**: Replace the simple historical list with a visual bar chart showing monthly trends for housing, transport, and food footprints. Add a table showing past entries with "Delete" capabilities to correct mistakes.
- **Backend support**: Implement a `DELETE /api/carbon-events/:id` route to manage user edits.


### 4. [x] Complete | Reduce & Insights: Personalized "AI Climate Coach"
- **Goal**: Use behavioral psychology to guide reduction.
- **Action**: Added an interactive feedback card in the React interface displaying dynamic coaching tips based on user's 30-day logging statistics.
- **Backend support**: Created an insights engine service in `apps/api/src/services/insights.ts` serving telemetry analysis and recommendations.

### 5. [x] Complete | Simple Actions & Insights: Frictionless Onload & Progressive Profiling
- **Goal**: Eliminate the friction of initial form filling to enable an instantaneous dashboard experience on first load.
- **Action (Frictionless Signup)**:
  - **Randomized Eco-Name**: Auto-assign a placeholder (e.g. `Sage Leaf #381` or `Pine Seedling #945`) when no user session exists.
  - **Automated Geolocation**: Request the HTML5 Geolocation API, or fallback to an IP geo API lookup (like `ipapi.co/json`) to auto-detect country and postal code. Use defaults (e.g. `us` / `90210`) if blocked.
  - **Implicit Onboarding**: Register the user silently in the background with average baseline options on load, showing the dashboard immediately.
- **Action (Progressive Profiling)**:
  - Add a "Quick Setup" checklist or micro-survey card at the top of the main dashboard.
  - Ask single quick questions sequentially (e.g., *"What is your housing type?"*, *"How do you commute?"*, *"What is your diet?"*) with direct button answers.
  - Answering these questions updates their archetype baseline and updates their database records dynamically without leaving the dashboard.
  - Provide an edit option in the card to let them customize their auto-assigned name or postal code.

---

## 📈 Impact on Hackathon Rating
Implementing these features directly targets **Problem Statement Alignment** and **Code Quality** (by cleaning up stubs/mockups with robust, complete user interactions). This will provide the necessary score push to rise into the top-tier Hackathon leaderboard standings.
