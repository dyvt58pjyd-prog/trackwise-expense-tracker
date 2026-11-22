# 💰 TrackWise: Offline-First Daily Expense, Bill & Personal Finance Tracker

> **Credits: Made by Anurag Bawaskar**

A production-ready, **100% offline-first** Daily Expense, Bill & Personal Finance Tracker built with **React 18+, Vite, TypeScript, and Tailwind CSS**. Designed to run seamlessly as an installable **PWA (Web, Android, macOS, Windows)**, deployable with zero configuration to **Vercel via GitHub**, and integrated with **Neon Serverless PostgreSQL** for automatic two-way synchronization between Web and Android!

---

## ⚡ Key Highlights & Architecture

- **100% Offline & Private First:** All UI and interactions read/write instantly from the local **IndexedDB** (`TrackWiseFinanceDB` via Dexie.js). You never experience lag or loading spinners when logging expenses.
- **Neon Serverless Postgres + Vercel API Bridge:**
  - When online, your Web app and Android APK synchronize automatically in the background with **Neon Serverless PostgreSQL**.
  - Powered by a secure Vercel Serverless Function (`api/sync.ts`), your `DATABASE_URL` is kept **100% secret** inside Vercel environment variables. No database credentials are ever exposed in client or APK bundles.
- **Local Cryptography & Multi-Profile Security:**
  - Password and 4-digit PIN authentication using browser-native **Web Crypto API (`SHA-256` with 128-bit random salt)**.
  - Optional **AES-GCM 256-bit PBKDF2 encrypted backup export** for secure transfers between devices.
  - Multi-profile isolation: Data scoped strictly by `userId` and `username`.
  - Configurable auto-lock timeout (e.g. 5 min, 15 min, Never) and instant "Quick Lock" header action.
- **Fast 2-Tap Quick Entry & Keyboard Shortcuts:**
  - Floating Action Button (FAB) on mobile + global `Cmd+N` / `Ctrl+N` keyboard shortcut on Desktop.
  - Client-side HTML5 Canvas receipt photo compression before saving as a Blob in IndexedDB.
  - Built-in full-screen zoomable **Receipt Lightbox Viewer**.
- **Comprehensive Personal Finance Modules:**
  - **Recurring Bills & EMIs:** Monthly checklist view with due badges (overdue, due within 5 days) and one-click "Mark as Paid" that automatically logs expense transactions.
  - **Monthly Budgets & Category Limits:** Dynamic progress bars shifting dynamically (Green `<75%`, Amber `75%–95%`, Red `>95%` or exceeded).
  - **Savings Goals & Milestones:** Target amount, completion date, progress tracking, one-click contribution modal, and automatic monthly savings calculation.
  - **Lend & Borrow (Udhar / Split):** Track loans given to or taken from friends/family with partial/full settlement status.
  - **Analytics & Visual Reports:** Category Donut Chart, Daily Spending Area Trend, and 6-Month Income vs. Expense Bar Chart powered by `recharts`.
  - **One-Click Exports:** High-quality Excel (`.xlsx`) via SheetJS and formatted, printable PDF Monthly Statements via `jspdf` + `jspdf-autotable`.

---

## 🐘 Neon Serverless Postgres Setup (3 Simple Steps)

### Step 1: Create a Free Neon Database
1. Go to [console.neon.tech](https://console.neon.tech) and create a free account.
2. Create a new project (e.g., `trackwise-finance`).
3. Copy your database connection string (looks like: `postgres://user:password@ep-xyz.neon.tech/neondb?sslmode=require`).

### Step 2: Run the Schema in Neon SQL Editor
1. In your Neon Dashboard, open the **SQL Editor**.
2. Open [`neon-schema.sql`](file:///Users/anuragbawaskar/.gemini/antigravity/scratch/expense-tracker/neon-schema.sql) from this repository (or click **"Copy SQL Script"** inside the app Settings → Neon Sync tab).
3. Paste it into the Neon SQL editor and click **Run**.

### Step 3: Add `DATABASE_URL` in Vercel
1. In your Vercel Project Dashboard, go to **Settings → Environment Variables**.
2. Add a new variable:
   - **Key:** `DATABASE_URL`
   - **Value:** `postgres://user:password@ep-xyz.neon.tech/neondb?sslmode=require`
3. Click **Save** and trigger a redeploy.

*That's it! Your Vercel `/api/sync` serverless function will now automatically connect your Web app and Android APK to Neon.*

---

## 📱 Connecting the Android APK to Live Sync

When running the Android APK on your phone, you have two simple ways to connect it to your live Vercel + Neon sync:

### Method A: In-App Settings (Zero Code Required!)
1. Open the app on your phone.
2. Tap the Profile icon in the top right → **Neon Sync** tab.
3. In **Sync Server URL**, enter your deployed Vercel domain:
   `https://your-expense-tracker.vercel.app`
4. Tap **Test** then **Save**.
*Both your Android phone and your computer will now sync in real-time!*

### Method B: Native Live Vercel Web Shell
In [`capacitor.config.ts`](file:///Users/anuragbawaskar/.gemini/antigravity/scratch/expense-tracker/capacitor.config.ts), set your Vercel URL under `server.url`:
```typescript
const config: CapacitorConfig = {
  appId: 'com.trackwise.finance',
  appName: 'TrackWise Finance',
  webDir: 'dist',
  server: {
    url: 'https://your-expense-tracker.vercel.app',
    cleartext: true,
  },
};
```
Then run:
```bash
npx cap sync android
```

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Production build
npm run build
```

---

## 🌐 Deploy to Vercel via GitHub

```bash
git add .
git commit -m "feat: offline tracker with neon serverless sync"
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your repository.
3. In **Environment Variables**, add `DATABASE_URL` with your Neon connection string.
4. Click **Deploy**.

---

## 👤 Author & Credits
**Credits: Made by Anurag Bawaskar**

---

## 📄 License
MIT License. Built for complete privacy, speed, and cross-platform flexibility.
