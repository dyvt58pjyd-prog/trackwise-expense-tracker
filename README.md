# 💰 TrackWise: Offline-First Daily Expense, Bill & Personal Finance Tracker

A production-ready, **100% offline-first** Daily Expense, Bill & Personal Finance Tracker built with **React 18+, Vite, TypeScript, and Tailwind CSS**. Designed to run seamlessly as an installable **PWA (Web, Android, macOS, Windows)**, deployable with **zero configuration to Vercel via GitHub**, and architected with native packaging readiness (**Capacitor for Android APK** and **Electron for macOS DMG / Windows EXE**).

---

## ⚡ Key Highlights & Architecture

- **100% Offline & Private:** Zero cloud dependencies, zero external database backends, and zero telemetry. All credentials, transaction ledgers, receipt photo attachments, recurring bills, and savings goals reside exclusively inside the browser's local **IndexedDB** via **Dexie.js**.
- **Local Cryptography & Multi-Profile Security:**
  - Password and 4-digit PIN authentication using browser-native **Web Crypto API (`SHA-256` with 128-bit random salt)**.
  - Optional **AES-GCM 256-bit PBKDF2 encrypted backup export** for secure transfers between devices.
  - Multi-profile isolation: Data scoped strictly by `userId`.
  - Configurable auto-lock timeout (e.g. 5 min, 15 min, Never) and instant "Quick Lock" header action.
- **Fast 2-Tap Quick Entry & Keyboard Shortcuts:**
  - Floating Action Button (FAB) on mobile + global `Cmd+N` / `Ctrl+N` keyboard shortcut on Desktop.
  - Client-side HTML5 Canvas receipt photo compression before saving as a Blob into IndexedDB.
  - Built-in full-screen zoomable **Receipt Lightbox Viewer**.
- **Comprehensive Personal Finance Modules:**
  - **Recurring Bills & EMIs:** Monthly checklist view with due badges (overdue, due within 5 days) and one-click "Mark as Paid" that automatically logs expense transactions.
  - **Monthly Budgets & Category Limits:** Dynamic progress bars shifting dynamically (Green `<75%`, Amber `75%–95%`, Red `>95%` or exceeded).
  - **Savings Goals & Milestones:** Target amount, completion date, progress tracking, one-click contribution modal, and automatic monthly savings calculation.
  - **Lend & Borrow (Udhar / Split):** Track loans given to or taken from friends/family with partial/full settlement status.
  - **Analytics & Visual Reports:** Category Donut Chart, Daily Spending Area Trend, and 6-Month Income vs. Expense Bar Chart powered by `recharts`.
  - **One-Click Exports:** High-quality Excel (`.xlsx`) via SheetJS and formatted, printable PDF Monthly Statements via `jspdf` + `jspdf-autotable`.

---

## 🛠 Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 18 + Vite** | Fast, modern frontend library & build tool |
| **TypeScript** | Strict compile-time type safety |
| **Tailwind CSS** | Utility-first responsive fintech styling & Dark Mode |
| **Lucide React** | Clean, lightweight icon suite |
| **Dexie.js** | Production IndexedDB wrapper for offline storage |
| **Recharts** | Interactive SVG charts (Donut, Area, and Bar) |
| **SheetJS (xlsx)** | Offline Excel statement generation |
| **jsPDF + AutoTable** | Formatted printable PDF monthly statement exports |
| **vite-plugin-pwa** | Service worker asset caching & PWA manifest setup |
| **Web Crypto API** | Built-in salted SHA-256 hashing and AES-GCM encryption |

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build
```bash
npm run build
```
This triggers TypeScript checks (`tsc -b`) and Vite production bundling (`vite build`) with precache service workers generated for offline PWA operation.

---

## 🌐 Deploy to Vercel via GitHub

1. **Initialize Git Repository & Commit:**
   ```bash
   git init
   git add .
   git commit -m "feat: offline-first personal finance tracker"
   ```

2. **Push to your GitHub repository:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/trackwise-finance.git
   git push -u origin main
   ```

3. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Import your GitHub repository.
   - Framework preset: **Vite** (auto-detected).
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Click **Deploy**.
   
> **Note:** The included `vercel.json` already provides SPA rewrites (`"source": "/(.*)", "destination": "/index.html"`), so refreshing on any route will never trigger a 404 error.

---

## 📱 PWA Installation (Instant Native Feel)

Once deployed to Vercel or accessed over HTTPS:
- **Android (Chrome):** Tap the menu `⋮` -> **"Add to Home screen"** or tap the install banner.
- **iOS / iPadOS (Safari):** Tap the Share button -> **"Add to Home Screen"**.
- **macOS / Windows (Chrome/Edge):** Click the **Install** icon in the URL bar to run TrackWise as a standalone desktop app.

---

## 📦 Cross-Platform Packaging (Optional Native Wrappers)

### A. Android APK (Capacitor)
The project includes a ready `capacitor.config.ts`.
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npm run build
npx cap sync android
npx cap open android
```
*Run or build your signed APK in Android Studio.*

### B. macOS (`.dmg`) & Windows (`.exe`) (Electron)
The project includes `electron/main.js` and `electron/preload.js`.
```bash
# Install Electron dev dependencies
npm install -D electron electron-builder

# Test in Electron development mode
ELECTRON=true npm run electron:dev

# Package into .dmg (macOS) or .exe (Windows)
npx electron-builder build
```

---

## 🔒 Security & Privacy FAQ

- **Where is my data stored?**  
  All data is stored exclusively in your device's browser `IndexedDB`.
- **Can anyone read my password or PIN?**  
  No. Passwords and PINs are salted with random 128-bit cryptographic seeds and hashed using the browser's native **Web Crypto API (`SHA-256`)**. Plaintext credentials never exist in storage.
- **Can I transfer my data to another device?**  
  Yes! Go to **Settings -> Backup & Restore -> Export Encrypted Backup**. Enter an optional passphrase, and an encrypted `.json` file will be downloaded. On your new device, choose **Restore / Import Data** and enter your passphrase.

---

## 📄 License
MIT License. Built for complete privacy and financial peace of mind.
