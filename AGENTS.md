Project: VastuLedger (Enterprise Indian RWA Financial & Compliance OS)

Stack: Pure modern JavaScript ONLY (.js/.jsx, ESM "type": "module"). ZERO TypeScript (.ts/.tsx).

Frontend: React 19 + Vite 8 + Tailwind CSS v4 (use @import "tailwindcss"; and @theme in src/index.css, NO tailwind.config.js) + selective MUI v6/v7 (@mui/x-data-grid & drawers) + three / @react-three/fiber / @react-three/drei (with 2D SVG fallback) + motion (motion/react) + recharts + qrcode.react + jspdf.

Theme: "Architectural Obsidian (#0B0F17) & Warm Terracotta Amber (#F59E0B) + Veridian Teal (#14B8A6)" dark-first palette with Limestone Light (#F7F5F0) toggle, using Plus Jakarta Sans, Inter, and JetBrains Mono (tabular-nums for ₹ INR).

Backend: Node.js ESM + Express 5 + mysql2/promise + zod + helmet + node-cron + AES-256-GCM field encryption (cryptoVault.js) + SHA-256 tamper-evident ledger hash chaining (ledgerHash.js) + dual-token JWT (15m memory Access Token + 7d HttpOnly Refresh Cookie).

Roles: ADMIN, TREASURER, COMMITTEE, RESIDENT with dynamic system_settings rules (calculation slabs, late-fee engine, maker-checker expense threshold, UPI VPA, feature toggles).

Folder Structure: Strict separation into frontend/src/{config,context,services,utils,hooks,components/{layout,three,ui,tables},pages/{auth,dashboard,ledger,governance,admin}} and backend/src/{config,middlewares,models,services,controllers,routes,utils,tests}.