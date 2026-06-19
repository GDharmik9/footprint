# Checklist for Backend & Frontend Refactoring (Step B / Option E)

- `[x]` Create frontend components directory `apps/web/src/components/`
- `[x]` Refactor `EcoSphere` into its own component `apps/web/src/components/EcoSphere.tsx`
- `[x]` Refactor `QuickTracker` into its own component `apps/web/src/components/QuickTracker.tsx`
- `[x]` Refactor `Simulator` into its own component `apps/web/src/components/Simulator.tsx`
- `[x]` Refactor `ActivityLogs` into its own component `apps/web/src/components/ActivityLogs.tsx`
- `[x]` Re-integrate and clean up `App.tsx` using the extracted React components
- `[x]` Restructure backend into route controllers (`userController.ts`, `eventController.ts`, `challengeController.ts`, `sponsorController.ts`, `webhookController.ts`)
- `[x]` Mount controllers in `server.ts` routing layer and clean up unused code
- `[x]` Verify monorepo building with zero TypeScript errors and run all test suites

---

# Checklist for AI Climate Coach & Interactive Recommendations (Option D)

- `[x]` Create backend service `apps/api/src/services/insights.ts` for dynamic analysis and micro-task recommendations
- `[x]` Implement `GET /api/users/:id/insights` route in `apps/api/src/server.ts` with auth checks
- `[x]` Add frontend state hooks, fetch logic, and offline simulations in `apps/web/src/App.tsx`
- `[x]` Build the "AI Climate Coach & Micro-Actions" glassmorphic UI card in `App.tsx`
- `[x]` Integrate interactive button triggers linking card items to quick logging actions
- `[x]` Verify local execution, run tests, and run `npm run build` to confirm zero TS errors

---

# Checklist for Ingestion History and Trends Graph (Option C)

- `[x]` Implement `DELETE /api/carbon-events/:id` route in `apps/api/src/server.ts`
- `[x]` Add unit tests / local verification for the backend delete endpoint
- `[x]` Update client `App.tsx` imports to include `Trash2` and `Database`
- `[x]` Implement `deleteCarbonEvent` helper in `App.tsx` handling online and offline modes
- `[x]` Build the toggle selector state and buttons for Total Trend vs. Category Breakdown
- `[x]` Build the Category Breakdown stacked bar chart SVG renderer in `App.tsx`
- `[x]` Build the Activity Ingestion History feed panel listing events with delete buttons
- `[x]` Verify local execution and run `npm run build` to confirm passing

---

# Checklist for Contextual Carbon Equivalency Metrics (Option B)

- `[x]` Implement `getCarbonEquivalents` and `getCarbonEquivalentsDescription` in `packages/carbon-math/src/index.ts`
- `[x]` Add unit tests for the equivalency functions in `packages/carbon-math/src/index.test.ts`
- `[x]` Integrate equivalents display in React UI (Trajectory Panel and Event History) in `App.tsx`
- `[x]` Verify local execution and build passing

---

# Checklist for One-Click Quick Logging (Option A)

- `[x]` Define quick log preset actions and their payload configurations in `App.tsx`
- `[x]` Implement a helper function `triggerQuickLog(category, mode, value, unit)` on the client
- `[x]` Build the "Quick Action Tracker" dashboard panel with action buttons in `App.tsx` UI
- `[x]` Verify local execution and integration

---

# Checklist for Frictionless Onload & Progressive Profiling

- `[x]` Update backend API (`apps/api`) to allow updating a user's details and recalculating their baseline.
- `[x]` Update client-side (`apps/web`) to auto-generate randomized eco names and call IP Geolocation lookup on load.
- `[x]` Update client-side (`apps/web`) to perform silent onboarding registration in the background if no user exists.
- `[x]` Implement the "Progressive Profiling Prompts" UI widget in `App.tsx` showing step-by-step calibration.
- `[x]` Verify local execution and integration.

---

# Checklist for Step A: Security Hardening & Input Verification

- `[x]` Install backend dependencies (`helmet`, `express-rate-limit`, `zod`, `cookie-parser` and devDependencies for TypeScript)
- `[x]` Implement Zod validation schemas and middleware in `apps/api/src/validation.ts`
- `[x]` Secure Express app configurations (Helmet, rate-limiting, CORS credentials, cookie-parser) in `apps/api/src/server.ts`
- `[x]` Upgrade authentication flow (`auth.ts` and `userController.ts`) to use HTTP-only secure cookies with authorization header fallback
- `[x]` Add a backend auth logout route `/api/auth/logout` that clears the cookie
- `[x]` Adapt client-side fetches (`App.tsx`) to support `credentials: 'include'` for cookie sharing
- `[x]` Add frontend logout handler to clear cookie and reset local auth state
- `[x]` Verify changes locally: compile cleanly, run unit tests, and perform manual sanity checks
