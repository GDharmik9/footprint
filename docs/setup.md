# 🛠️ Footprint Local Run & Setup Guide

This document guides developers through setting up the **Footprint** monorepo project locally, installing dependencies, configuring databases, compiling code, and launching the frontend and backend servers.

---

## 📋 Prerequisites

Before setting up the project, make sure you have installed:
- **Node.js** (v18.0.0 or higher is recommended)
- **NPM** (v10.0.0 or higher)
- **PostgreSQL** (Optional; local development defaults to a zero-dependency JSON database if PostgreSQL is unavailable)

---

## 📦 Monorepo Workspace Configuration

Footprint uses **NPM Workspaces** to manage the monorepo:
- **Root**: Coordinates overall scripts, packages, and dependencies.
- **Packages**:
  - [`packages/shared-types`](file:///d:/new_era/Hackthon/footprint/packages/shared-types): Common TypeScript definitions.
  - [`packages/carbon-math`](file:///d:/new_era/Hackthon/footprint/packages/carbon-math): GHG protocol calculation library.
- **Applications**:
  - [`apps/web`](file:///d:/new_era/Hackthon/footprint/apps/web): React + Vite + TypeScript frontend.
  - [`apps/api`](file:///d:/new_era/Hackthon/footprint/apps/api): Express.js REST backend API.

---

## 🚀 Setup Steps

### 1. Install Workspace Dependencies
From the monorepo root directory, run the installation. We use `--legacy-peer-deps` to handle React 19 peer dependencies smoothly:
```bash
npm install --legacy-peer-deps
```

### 2. Build Shared Packages
Build and compile TypeScript for the shared packages so that the backend and frontend can import them:
```bash
npm run build
```

This compiles:
1. `@footprint/shared-types`
2. `@footprint/carbon-math`

---

## 🏃 Running the Applications

You can start the backend and frontend simultaneously or run them in separate terminals.

### Option A: Concurrent Development (Recommended)
You can start both applications concurrently with a single command from the monorepo root:
```bash
npm run dev
```

### Option B: Run Services Individually

1. **Start the API Server (`@footprint/api`)**:
   ```bash
   npm run dev -w @footprint/api
   ```
   - **Port**: `http://localhost:3001`
   - **Fallback database**: If PostgreSQL is not found, the server automatically reads and writes to `apps/api/footprint_dev_db.json`.

2. **Start the Frontend Dashboard (`@footprint/web`)**:
   ```bash
   npm run dev -w @footprint/web
   ```
   - **Vite Server**: `http://localhost:5173`
   - **Mode**: Connects to the Express API on port `3001`. If the API is offline, it enters local fallback simulation mode.

---

## 💾 Database Configuration

The backend Express application supports two modes:
1. **PostgreSQL Mode**: Connects using the `DATABASE_URL` environment variable.
2. **Local Fallback Mode**: If PostgreSQL connection fails or isn't configured, the system writes to [`apps/api/footprint_dev_db.json`](file:///d:/new_era/Hackthon/footprint/apps/api/footprint_dev_db.json) automatically.

To configure PostgreSQL:
- Create a database named `footprint`.
- Pass `DATABASE_URL` in your environment variables:
  ```bash
  DATABASE_URL=postgresql://<username>:<password>@localhost:5432/footprint
  ```

---

## 🧑‍💻 Seeding Data
On first launch, when you onboard a user:
1. A new user record is created in the database.
2. A 7-day streak for **"The Cold-Wash Campaign"** and **"The Vampire Hunt"** is seeded.
3. 29 mock competitor users are seeded in the weekly **Eco-Leagues Leaderboard** to simulate a live leaderboard competition.
4. Historical carbon data for the past 6 months is automatically backfilled, allowing the frontend chart to load rich visualization data immediately.
