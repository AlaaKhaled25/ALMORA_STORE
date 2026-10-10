# AGENTS.md

Guidance for agents working in this repository.

## Project

Single-store e-commerce platform (storefront + admin dashboard).
Full requirements live in `docs/PRD.md`. Section 0 decisions override the PRD's open questions.

## Confirmed MVP decisions (see PRD section 0)

- Storefront language: Arabic with full RTL support.
- Currency: EGP.
- No customer accounts in MVP. Guest checkout only; only the admin logs in.
- Order tracking by non-guessable order number + phone number.
- Single-level categories; each product belongs to exactly one category.
- Stock is deducted atomically when an order is created, restored once if cancelled.
- No notifications (order confirmation page only).
- Single Admin role for MVP; more roles later.
- Payment: Cash on Delivery only; orders start as Unpaid.
- Shopping cart is kept in the browser (localStorage).

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Firebase Firestore (NoSQL) for data, Firebase Authentication for admin login, Firebase Storage for product images.
- Deployed on Vercel.
- PWA support (manifest + service worker).

## Conventions

- Never commit secrets. All env files and Firebase service-account JSON files are gitignored.
- Enforce authorization on the server (API routes / Firestore rules), never rely on the UI.
- Use integer minor units (piastres) for money; never binary floating point.
- Use Firestore transactions for order creation and inventory changes.

## Commands

_(Run these only once `package.json` exists.)_

- Install deps: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
