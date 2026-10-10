# Project: Single-store E-commerce (Cash on Delivery) + Admin Dashboard

## Source of truth
- Read `docs/PRD.md` before ANY task. Section 0 of the PRD ("Confirmed MVP Decisions") overrides everything else in it.
- Do NOT add features outside the MVP scope. If something is unclear, ask me before guessing.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Backend = Next.js API routes (`src/app/api/...`), deployed on Vercel
- Database = Firebase Firestore (NOT SQL). Adapt the PRD data model to Firestore collections.
- Admin login = Firebase Authentication
- Server-side Firebase access uses `firebase-admin` (only inside API routes, never in browser code)
- PWA support
- UI language: Arabic, RTL layout. Currency: EGP.

## Project structure
- `src/app/(store)/`  -> customer pages (products, cart, checkout, order tracking)
- `src/app/admin/`    -> admin dashboard pages
- `src/app/api/`      -> backend endpoints
- `src/lib/`          -> firebase setup, helpers
- `src/components/`   -> reusable UI parts
- `docs/PRD.md`       -> requirements

## Working rules (I am a beginner)
1. Build ONE small step at a time. When it works, STOP and wait for my review. Never start the next phase on your own.
2. Keep code simple, with short comments. Prefer easy-to-read code over clever code. No unnecessary libraries.
3. Before coding a step, list the files you will create or change.
4. After each step tell me, in simple words: what you changed, how to run it, how to test it.
5. Never hardcode secrets. Use `.env.local` for keys, make sure `.env.local` is in `.gitignore`, and tell me exactly what values I must add (and where to get them).
6. Never trust the frontend: prices, totals, stock and admin permissions must be checked in the API (backend).
7. Store prices as integers (piasters) or in a decimal-safe way, never floats.
8. Order creation must be atomic: use a Firestore transaction to check stock, deduct stock, and create the order together. Protect against duplicate submissions.
9. Orders keep a snapshot of product name/price at order time.

## Git workflow (after EVERY finished step)
1. Run the project and make sure it builds (`npm run build`) without errors.
2. `git add .`
3. `git commit -m "<short clear message, e.g. feat: add admin login>"`
4. `git push`
Never commit `.env.local` or any secret. If push fails, tell me the exact error instead of trying random fixes.

## Phases (do them in this order, one at a time)
1. Setup + Firebase connection + admin login
2. Categories and products management (admin)
3. Storefront (products list, product details)
4. Cart + checkout with Cash on Delivery
5. Orders management (status changes) + stock handling
6. Dashboard statistics
7. PWA + deploy to Vercel