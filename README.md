# VastuLedger — Enterprise Indian RWA Financial & Compliance OS

> A production-grade Cooperative Housing Society (RWA) Financial, Compliance, and Transparent Ledger Operating System engineered specifically for Indian residential complexes.

---

## Architecture & Tech Stack

- **Pure Modern JavaScript:** 100% pure `.js` and `.jsx` with native ES2025+ modules (`"type": "module"`). Zero TypeScript.
- **Frontend:**
  - **React 19** + **Vite 8**
  - **Tailwind CSS v4** (`@import "tailwindcss";` and `@theme` in `src/index.css`)
  - Selective **Material UI** (`@mui/x-data-grid`) themed to match the design tokens
  - **Three.js** + **@react-three/fiber** + **@react-three/drei** for interactive 3D digital twin of society wings with 2D isometric SVG fallback
  - **motion** (`motion/react`) for fluid layout transitions and rolling currency counters
  - **qrcode.react** for dynamic NPCI UPI intent QR codes
  - **jspdf** + **jspdf-autotable** for CA-ready audit PDFs and GST maintenance vouchers
  - **recharts** for cashflow and fund allocation telemetry
- **Backend:**
  - **Node.js LTS** + native ESM
  - **Express 5** with native async error handling
  - **mysql2/promise** connection pool with prepared statements
  - **Dual-Token Session Architecture:** Short-lived 15m JWT Access Token kept strictly in React memory + 7d HttpOnly, Secure, SameSite=Strict Refresh Cookie
  - **AES-256-GCM Field Encryption (`cryptoVault.js`)**: Encrypts sensitive resident/vendor PII at rest
  - **SHA-256 Tamper-Evident Ledger Chaining (`ledgerHash.js`)**: `row_hash = SHA256(prev_hash + txId + amount + type + timestamp)`
  - **node-cron**: Automated monthly billing generation on the 1st and daily late-fee penalty engine
  - **Zod**: Input validation on all API endpoints
  - **Helmet & Rate Limiting**: API hardening and brute-force protection
- **Test Suite:**
  - **Vitest** + **Supertest** covering dynamic billing slabs, RBAC session escalation, and ledger cryptographic hash-chain integrity.

---

## Theme & Visual Identity

- **Design Philosophy:** "Architectural Obsidian & Warm Terracotta Amber"
- **Dark Mode Palette:**
  - Deep Obsidian Canvas: `#0B0F17`
  - Elevated Glass Surface: `#131A26` with `backdrop-blur-xl` and `1px solid rgba(255, 255, 255, 0.08)`
  - Primary Accent: `#F59E0B` / `#D97706` (Warm Terracotta Amber)
  - Secondary Fund Inflows: `#14B8A6` / `#0D9488` (Veridian Teal)
  - Arrears / Alert: `#E11D48` (Crimson Rose)
- **Light Mode Palette:**
  - Warm Limestone Canvas: `#F7F5F0` with pure `#FFFFFF` cards
- **Typography:** `Plus Jakarta Sans` (headings), `Inter` (body), `JetBrains Mono` (`tabular-nums` for all ₹ INR amounts).

---

## Seed Accounts & Role Permissions

All demo accounts use the standard password: **`Vastu@2026`**

| Role | Email | Name | Capabilities & Access Scope |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@vastuledger.in` | Arun Prasad | Full control: Platform config, dynamic billing slabs, Maker-Checker threshold, system audit trail, users & flats. |
| **TREASURER** | `treasurer@vastuledger.in` | Deepa Sharma | Generate monthly bills, verify resident UPI UTRs (reconciliation), log vendor expenses with receipts, export CA audit PDFs. |
| **COMMITTEE** | `committee1@vastuledger.in` | Sanjay Joshi | Maker-Checker co-signing: approve/reject high-value vendor expenses above ₹15,000 threshold, publish AGM resolutions. |
| **RESIDENT** | `rajesh@vastuledger.in` | Rajesh Kulkarni (A-101) | Inspect personal maintenance bill, scan dynamic UPI QR code, submit 12-digit UTR, inspect public transparency vault, vote on AGM polls. |

---

## Directory Structure

```text
vastu-ledger/
├── .antigravityignore
├── AGENTS.md
├── GEMINI.md
├── PROGRESS.md
├── README.md
│
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── vitest.config.js
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   ├── db.js
│       │   └── security.js
│       ├── middlewares/
│       │   ├── authMiddleware.js
│       │   ├── rbacMiddleware.js
│       │   ├── validateRequest.js
│       │   ├── auditLogger.js
│       │   └── errorHandler.js
│       ├── models/
│       │   ├── schema.sql
│       │   ├── seed.sql
│       │   ├── userModel.js
│       │   ├── flatModel.js
│       │   ├── ledgerModel.js
│       │   ├── expenseModel.js
│       │   ├── billingModel.js
│       │   ├── pollModel.js
│       │   └── configModel.js
│       ├── services/
│       │   ├── authService.js
│       │   ├── billingService.js
│       │   ├── reconciliationService.js
│       │   ├── ledgerService.js
│       │   ├── cronService.js
│       │   ├── adminConfigService.js
│       │   └── auditService.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── billingController.js
│       │   ├── ledgerController.js
│       │   ├── governanceController.js
│       │   └── adminController.js
│       ├── routes/
│       │   ├── index.js
│       │   ├── authRoutes.js
│       │   ├── billingRoutes.js
│       │   ├── ledgerRoutes.js
│       │   ├── governanceRoutes.js
│       │   └── adminRoutes.js
│       ├── utils/
│       │   ├── cryptoVault.js
│       │   ├── ledgerHash.js
│       │   └── apiResponse.js
│       └── tests/
│           ├── billing.test.js
│           ├── authRbac.test.js
│           └── ledgerIntegrity.test.js
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── config/
        │   └── env.js
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── ThemeContext.jsx
        │   └── SocietyConfigContext.jsx
        ├── hooks/
        │   ├── usePermission.js
        │   └── useDebounce.js
        ├── services/
        │   ├── apiClient.js
        │   ├── authService.js
        │   ├── billingService.js
        │   ├── ledgerService.js
        │   ├── governanceService.js
        │   └── adminService.js
        ├── utils/
        │   ├── formatCurrency.js
        │   ├── upiQrGenerator.js
        │   ├── cryptoClient.js
        │   └── pdfExporter.js
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.jsx
        │   │   ├── NotificationBell.jsx
        │   │   └── ProtectedRoute.jsx
        │   ├── three/
        │   │   ├── SocietyTower3D.jsx
        │   │   └── FallbackWingMap.jsx
        │   ├── ui/
        │   │   ├── AnimatedCounter.jsx
        │   │   ├── GlassCard.jsx
        │   │   ├── StatusBadge.jsx
        │   │   └── UpiPaymentModal.jsx
        │   └── tables/
        │       └── LedgerDataGrid.jsx
        └── pages/
            ├── auth/
            │   └── LoginPage.jsx
            ├── dashboard/
            │   └── CommandCenterPage.jsx
            ├── ledger/
            │   ├── MaintenanceBillsPage.jsx
            │   └── ExpenseVaultPage.jsx
            ├── governance/
            │   └── AgmPollsPage.jsx
            └── admin/
                └── AdminControlPanelPage.jsx
```

---

## Quick Start Guide

### 1. Database Setup (MySQL)
Create database and import the schema and seed scripts:
```bash
mysql -u root -p -e "CREATE DATABASE vastuledger CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p vastuledger < backend/src/models/schema.sql
mysql -u root -p vastuledger < backend/src/models/seed.sql
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials if required
npm install
npm run dev
# Server starts on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
# Frontend Vite dev server launches at http://localhost:5173
```

### 4. Running Backend Test Suite
```bash
cd backend
npm test
```
Runs Vitest test runner verifying:
- Bill calculation under `FLAT_SQFT` and `HYBRID` modes
- 10% Non-Occupancy surcharge logic
- Overdue simple percentage late-fee interest calculation
- Dual-token session issuance and HttpOnly cookie security
- RBAC 403 Forbidden enforcement for role escalation attempts
- SHA-256 ledger row hash calculation and tamper detection
- Maker-Checker threshold approval enforcement
