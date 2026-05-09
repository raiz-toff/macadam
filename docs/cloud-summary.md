# Macadam: Project Overview & Architectural Summary

Macadam is a premium, **local-first** financial management dashboard designed specifically for independent delivery partners (Gig economy workers). It transforms raw earnings and expense data into actionable business intelligence while maintaining absolute user data sovereignty.

## 核心 (Core) Philosophy: Data Sovereignty
Unlike traditional SaaS platforms, Macadam operates on a **zero-cloud persistence** model. User data never leaves the browser. This eliminates privacy concerns, reduces server costs to near-zero, and ensures the application remains functional offline.

---

## 🛠 Technical Stack
- **Framework**: [Astro 5.0+](https://astro.build/) (Static Site Generation with View Transitions)
- **Data Layer**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper) for robust local storage.
- **Styling**: Bootstrap 5.3 + Custom Vanilla CSS for a "Bento-Box" aesthetic.
- **State Management**: Reactive local-first synchronization between IndexedDB and `localStorage`.
- **Client-Side Routing**: Astro `ClientRouter` for seamless, app-like navigation.

---

## 🚀 Key Features

### 1. Immersive Onboarding
A multi-step wizard that establishes the user's "Vault." It captures:
- Identity & Preferences (Avatars, Currency)
- Vehicle Context (Gas/EV/Bike efficiency)
- Financial Targets (Earnings goals, tax withholding)

### 2. The "Hidden Vault" Architecture
All dashboard content is protected by an onboarding guard. The UI remains in a "locked" state (`hidden-vault`) until the local database is initialized, preventing unauthorized data flashes or un-initialized state errors.

### 3. Transient Demo Mode ("Sandbox")
Prospects can explore the full dashboard without creating a permanent account. 
- **Session-Only**: Data is stored in `sessionStorage` and wiped when the tab closes.
- **Read-Only Lock**: A global safety layer disables all data-mutating UI elements (Save/Delete/Wipe) during demo sessions.

### 4. Custom Notification & Safety System
- **MacadamNotify**: A custom Toast system replaces restrictive browser `alert()` calls.
- **MacadamConfirm**: Theme-aware confirmation modals replace native `confirm()`/`prompt()` dialogs, ensuring a professional UX that bypasses browser popup blockers.

---

## ☁️ Cloud Deployment Context
Since the application is **fully client-side** (local-first), it is optimized for Edge deployment:
- **Hosting**: Can be deployed to any static host (Vercel, Netlify, Cloudflare Pages, S3).
- **Scalability**: Infinite scalability as the "database" is distributed across user devices.
- **Maintenance**: No backend API to maintain, no database migrations to manage centrally, and zero GDPR/PII storage liabilities.

---

## 📈 Roadmap & Evolution
- **PWA Integration**: Full offline support and "Add to Home Screen" capability.
- **Advanced Aggregation**: Predictive tax estimation and multi-platform (Uber/DoorDash) normalization.
- **Visual Analytics**: Interactive charting for historical trend analysis.
