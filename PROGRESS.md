# Build Progress Checklist

## Phase 1: DB Schema & 25‑row Indian RWA Seed

- [x] Design MySQL tables for users, roles, ledgers, transactions, system settings.
- [x] Write seed script with 25 realistic Indian RWA records (name, address, PAN, GST, UPI VPA).
- [x] Verify foreign‑key constraints and initial ledger hash chain.

## Phase 2: Backend Security, Services & Controllers

- [x] Set up Express 5 server with ESM module type.
- [x] Implement `helmet`, CORS, rate‑limiting middleware.
- [x] Create `cryptoVault.js` (AES‑256‑GCM field encryption).
- [x] Create `ledgerHash.js` (SHA‑256 chaining of ledger entries).
- [x] Build JWT authentication (access token 15 min, refresh cookie 7 d).
- [x] Write services for users, transactions, and system settings.
- [x] Add controllers and route definitions.

## Phase 3: Frontend Theme, Contexts & 3D Tower

- [x] Scaffold React 19 + Vite 8 project with ESM.
- [x] Add Tailwind CSS v4 via `@import "tailwindcss";` and `@theme` in `src/index.css`.
- [x] Configure dark‑first palette (Obsidian, Terracotta Amber, Veridian Teal, Limestone Light).
- [x] Apply fonts: Plus Jakarta Sans, Inter, JetBrains Mono (tabular‑nums for ₹).
- [x] Create React contexts for auth, theme, and ledger data.
- [x] Integrate `@react-three/fiber`, `@react-three/drei` for a 3D tower visualisation with SVG fallback.

## Phase 4: Role Pages & Admin Config

- [x] Build page routes: auth, dashboard, ledger, governance, admin.
- [x] Implement role‑based UI components (layout, drawers, data‑grid).
- [x] Add MUI X Data Grid for ledger tables.
- [x] Wire up `motion/react` animations and `recharts` charts.
- [x] Add QR code generation (`qrcode.react`) and PDF export (`jspdf`).

## Phase 5: Testing Suite

- [x] Set up Vitest for unit tests.
- [x] Add Supertest integration tests for API endpoints.
- [x] Write end‑to‑end tests for key UI flows.
- [x] Ensure CI passes with coverage thresholds.

## Operational Verification & Fixes Completed

- [x] **Database & Auth Integration**: Verified MySQL connection pool with `Rush@1808` credentials on `vastuledger` database. Auto-rehash to bcrypt active; verified 200 SUCCESS on all 4 demo accounts (`admin@vastuledger.in`, `treasurer@vastuledger.in`, `committee1@vastuledger.in`, `rajesh@vastuledger.in` with password `Vastu@2026`).
- [x] **Full Dual-Palette Theme Switching**:
  - Registered `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css` for Tailwind CSS v4 class-based toggling.
  - Defined CSS variables for Obsidian Dark (`#0B0F17`) and Limestone Light (`#F7F5F0`) with elevated card backgrounds, borders, and text contrasts.
  - Updated `index.html` body to dynamic background `var(--bg-canvas)` and text `var(--text-primary)` with anti-flash script.
  - Refactored `AppShell`, `NotificationBell`, `UpiPaymentModal`, `LoginPage`, `CommandCenterPage`, `MaintenanceBillsPage`, `ExpenseVaultPage`, `AgmPollsPage`, `AdminControlPanelPage`, and `SocietyTower3D` to cleanly transition between Dark and Light mode.
  - Verified production build `npm run build` succeeds with zero errors (3,594 modules transformed).
- [x] **Admin Control Panel — Users & Flats CRUD** (add/update/delete):
  - Backend: `flatModel.js` — added `createFlat`, `updateFlat`, `deleteFlat`; `userModel.js` — added `deleteUser`; `adminController.js` — added Zod schemas + handlers for create/update/delete users & flats (email uniqueness, self-delete prevention, bcrypt password hashing); `adminRoutes.js` — added POST/PUT/DELETE routes for `/admin/users` and `/admin/flats` with audit logging.
  - Frontend: `adminService.js` — added `createUser`, `updateUser`, `deleteUser`, `createFlat`, `updateFlat`, `deleteFlat`; `AdminControlPanelPage.jsx` — Users & Flats tab now has Add/Edit/Delete buttons per row, animated modals with validation, and delete confirmation dialog.
- [x] **Fixed Command Center 3D Society Digital Twin theme switching**:
  - `SocietyTower3D.jsx` — replaced hardcoded `bg-[#0B0F17]` with `var(--bg-sidebar)` CSS variable so the 3D canvas container adapts to the active theme (Obsidian Dark / Limestone Light).
  - `SocietyScene` (3D scene) — ground podium now uses `var(--3d-ground)`, clubhouse uses `var(--3d-granite)`, both defined under `html.dark` and `html.light` in `index.css`.
  - Added `--3d-sky` CSS variable for sky/background theming in the 3D scene.
- [x] **Fixed 2D layout box overflow in Society Digital Twin**:
  - `FallbackWingMap.jsx` — added `overflow-hidden` to the root container and both Wing A/Wing B card containers to prevent content spillage.
- [x] **Expense Distribution Pie Chart Hover Visibility in Dark Theme**:
  - Built bespoke `CustomPieTooltip` and `CustomBarTooltip` in `CommandCenterPage.jsx` with high-contrast text (`text-white` on dark glass `#131A26` in dark mode, and `text-slate-900` on white card in light mode).
  - Added formatted ₹ INR currency, percentage share pill badge (`% share`), and colored category dot indicator.
  - Added global Recharts tooltip CSS rules in `src/index.css` overriding Recharts default `#666` label styling to ensure crystal-clear text contrast across all charts.
  - Added quick-glance colored category pills under the Pie Chart.
  - Fixed `grid-cols-1 md:grid-cols-2` flex layout (was `items-center` causing overflow).
  - `SocietyTower3D.jsx` — 2D mode now uses `h-screen` and wraps the `FallbackWingMap` in a rounded container, ensuring the 2D layout stays within the canvas bounds.

- [x] **Multi-Tenancy, Platform SuperAdmin & Society Topology**:
  - **Database Partitioning**: Added `societies` table (name, slug, registration_number, address, city, state, pincode, contact_email, contact_phone, status); `wings` table (`id`, `society_id`, `name`, `code`, `total_floors`, `has_elevator`); upgraded `flats` table with `society_id`, `wing_id`, `floor`, `occupancy_type`, flexible alphanumeric `number VARCHAR(20)` and `bhk VARCHAR(20)`.
  - **Option 1B Multi-Society Mapping**: Implemented `society_memberships` table mapping `(user_id, society_id, role, flat_id)`.
  - **Tenant Partitioning**: Partitioned `system_settings`, `maintenance_bills`, `upi_reconciliations`, `ledger_transactions`, `vendor_expenses`, `agm_polls`, and `audit_logs` with `society_id`.
  - **Platform SuperAdmin Role**: Added `is_superadmin BOOLEAN DEFAULT FALSE` to `users` table; seeded `superadmin@vastuledger.in` (`Vastu@2026`).
  - **Tenant Middleware**: `tenantMiddleware.js` extracts `x-society-id` header/param, verifies membership for regular users and grants full cross-society access to SuperAdmin.
  - **Society Service & API**: Mounted `/api/societies` with endpoints for listing, creating, updating societies, managing wings, bulk auto-generating flats, and single flat CRUD/alteration.
  - **Frontend Society Switcher**: Built `SocietySwitcher.jsx` dropdown in AppShell sidebar and top navigation for 1-click tenant switching.
  - **SuperAdmin Hub**: Built `PlatformSocietiesPage.jsx` (`/platform/societies`) with global tenant metrics and a full Onboard Housing Society wizard modal.
  - **Topology Manager**: Built `SocietyTopologyManager.jsx` in `/admin` with Wing creation/editing, Bulk Auto-Generate Flats modal (floor-by-floor batch unit builder), Alphanumeric flat search/filters, and **Single Entity Alteration Modal** (modify any flat's number, floor, BHK, sq.ft, occupancy status without affecting other units).
  - **Dynamic Digital Twin**: Upgraded `SocietyTower3D.jsx` and `FallbackWingMap.jsx` to dynamically position and display live units and wings from the database.
  - **Zero Compilation Errors**: Verified Vite build completes in ~18s with exit code 0. Full automated database workflow tested and verified.

## Phase 6: Killer Sales Features

- [x] **Killer Feature 1: Bank Statement Excel / CSV Auto-Reconciler**:
  - **Parser Engine (`bankStatementParser.js`)**: Parses Excel (`.xlsx`, `.xls`) and CSV statements from SBI, HDFC, ICICI, Kotak, Axis, and generic CSVs in-memory. Extracts 12-digit UPI UTRs/RRNs (`/(?:UPI|UTR|IMPS|NEFT)[\/:\-_]?\s*([0-9]{12})/i`), dates, and credit inflows.
  - **Multi-Tier Matching Engine (`reconciliationService.js`)**:
    - **Tier 1 (Direct UTR Match - 100% confidence)**: Cross-references extracted UTR with resident-submitted UTRs in `upi_reconciliations`.
    - **Tier 2 (Smart Match - 90% confidence)**: Detects flat numbers (`A-101`, `101`) or resident names in narration and matches against unpaid pending bills with identical amounts (resolves payments even if the resident forgot to submit their UTR on the portal).
    - **Tier 3 (Amount Mismatches & Unmatched Credits)**: Flags partial payments and non-maintenance bank interest/transfers.
  - **Preview & Batch Commit Endpoints**: Mounted `POST /api/billing/reconcile/bank-statement/preview` and `POST /api/billing/reconcile/bank-statement/commit` with audit logging (`BANK_STATEMENT_BATCH_RECONCILED`), RBAC restriction to `ADMIN` and `TREASURER`, and atomic ledger hash chaining.
  - **Interactive Frontend Reconciler Modal (`BankReconcilerModal.jsx`)**: Built drag-and-drop statement dropzone, match telemetry cards, batch selection checkboxes, and 1-click **"Approve & Reconcile to Ledger"** action.
  - **Automated Vitest Suite (`bankReconciler.test.js`)**: All 33 Vitest tests passing across 10 test suites; clean production Vite build (`dist/` built in 30s).
- [ ] **Killer Feature 2: WhatsApp Notification Bot (Cloud API Integration)**
- [x] **Killer Feature 3: Resident Helpdesk & Maintenance Ticketing**:
  - **Database Architecture (`helpdesk_tickets` & `helpdesk_ticket_comments`)**: Created relational schema for ticket tracking with category (`PLUMBING`, `ELECTRICAL`, `LIFT_ELEVATOR`, `SECURITY`, `CIVIL_LEAKAGE`, `HOUSEKEEPING`, `GENERAL`), priority (`LOW`, `MEDIUM`, `HIGH`, `EMERGENCY`), scope (`PRIVATE_FLAT`, `COMMON_AREA`), photo proof attachments, technician assignments, estimated costs, and 5-star ratings.
  - **Backend Service & RBAC (`ticketModel.js`, `ticketService.js`, `ticketController.js`)**: Mounted `/api/helpdesk` with automated in-app notifications to admins, emergency ticket prioritization, vendor assignment, resolution notes, and role-based privacy (residents cannot view other private flats' tickets).
  - **Frontend UI & Timeline (`HelpdeskTicketsPage.jsx`)**: Full ticketing interface with telemetry cards, ticket creation modal with photo dropzone, category pills, search/filter controls, technician assignment, estimated cost tracking, progress timeline comments, and resident star rating / closure flow. Mounted at `/helpdesk` with navigation link in `AppShell.jsx`.
  - **Automated Vitest Suite (`helpdesk.test.js`)**: 38 / 38 Vitest tests passing across 11 test suites; clean production Vite build in 19.5s.
- [x] **Killer Feature 4: Sovereign Zero-Fee UPI Payment Gateway & Webhook Engine (0% MDR / No Razorpay)**:
  - **Zero-Fee Sovereignty**: Direct UPI payment engine operating without middleman cuts (0% MDR) under Indian NPCI regulations. Eliminates 2% payment gateway fees.
  - **Dynamic NPCI `tr` Embedding**: Encodes unique transaction references `tr=VL-S<socId>-B<billId>-<hash>` in standard `upi://pay?` URIs for instant automated settlement.
  - **Database Schema (`upi_payment_sessions`)**: Created session tracking with reference IDs, payment status (`PENDING`, `SUCCESS`, `EXPIRED`, `FAILED`), bank UTR, metadata, and auto-expiration tracking.
  - **Backend Webhook & Settlement Engine (`upiGatewayService.js`, `billingController.js`)**: Public webhook `POST /api/billing/upi/webhook` with HMAC-SHA256 signature verification, idempotent atomic bill settlement to `PAID`, automatic creation of verified reconciliation records, and tamper-evident SHA-256 ledger chaining.
  - **Dynamic Frontend Gateway Modal (`UpiPaymentModal.jsx`)**:
    - Automatic session creation with real-time 2.5s radar polling for webhook events.
    - Dynamic QR code generation with embedded transaction parameters.
    - Mobile 1-tap intent button (`window.location.href = upiIntentUri`) launching installed UPI apps (GPay, PhonePe, Paytm, BHIM).
    - Visual radar listener ("Awaiting Bank Webhook Settlement") with 30-minute expiration countdown.
    - Instant celebratory auto-settlement animation with verified UTR badge and ledger confirmation.
    - Manual 12-digit UTR fallback form for residents who prefer manual submission.
  - **Automated Vitest Suite (`upiGateway.test.js`)**: 42 / 42 Vitest tests passing across 12 test suites; clean production Vite build in 17.5s.
- [ ] **Killer Feature 5: Official PDF Notice Board & Society Documents Vault**

> **Rule:** After completing each numbered phase, update this file by checking the completed items so the next model resumes from the next unchecked step.
