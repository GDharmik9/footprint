# 📄 Executive Project Summary

This document provides a high-level executive summary of the **Footprint** platform.

---

## 🎯 Executive Overview

**Footprint** is a micro-action carbon tracking platform built on a TypeScript monorepo workspace. It shifts the paradigm of environmental guilt into actionable carbon tracking through smart API automation, behavioral economics, and premium gamified dashboards.

---

## 💎 Primary Value Propositions

1. **Low-Friction Automation**: Rather than requiring manual entries, the system integrates with Arcadia, Google Nest, and Radar.io to track residential energy, HVAC usage, and transit distances automatically.
2. **Behavioral Gamification**: Streak-based challenges reward users with points (Leaves) to level up their virtual SVG Eco-Sphere plot.
3. **Escrow-Backed Rewards**: Escrow funds deposited by B-Corp corporate sponsors allow users to redeem Leaf points for brand discounts, smart appliances, or verified tree-planting initiatives.
4. **Privacy-by-Design**: Geofence tracking is calculated entirely on the mobile edge, sending only numerical metrics back to servers to protect user location data.

---

## 🏗️ Monorepo Summary

- **`apps/web`**: React dashboard using CSS glassmorphism, Outfit/Inter typography, and evolving Eco-Sphere SVG vectors.
- **`apps/api`**: Express backend providing REST routes, seed databases, and event brokers for Pub/Sub.
- **`packages/carbon-math`**: Formula module utilizing international GHG Protocol specifications to evaluate housing, diet, and transit impacts.
- **`packages/shared-types`**: Core interface boundaries to keep client and backend types synced.
