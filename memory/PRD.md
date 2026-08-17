# Deal Hunter AI — PRD

## Original goal
Professional SaaS AI-powered affiliate deal-hunting platform (USD-first, international-ready). Public deal site + admin dashboard with AI Content Generator, AI Sales Control Center, AI Sales Strategist, click tracking, conversion postback, SEO product pages, reports.

## User personas
- Consumer: hunts deals, uses AI search, clicks View Deal → affiliate redirect.
- Admin (owner): manages products, affiliate networks, daily sales goal, growth mode, AI content drafts, reviews strategist recs.

## Core requirements (static)
- No fake sales/clicks/reviews. All conversions via real postback.
- Never render "guaranteed" claims; use Goal / Estimate / Potential wording.
- Admin auth via JWT + seeded admin. No Google OAuth in v1.
- MongoDB only, `/api` prefix on every backend route.
- Public site light theme; admin dashboard dark navy theme.

## Implemented (2026-02)
- Backend FastAPI:
  - JWT auth with seeded admin.
  - Products/Categories/Networks CRUD.
  - Click tracking + affiliate redirect (`/api/track/click/{id}`).
  - Conversion postback (`/api/track/conversion`).
  - Dashboard stats, 14-day trend, settings (daily goal + growth mode), simulator.
  - Reports daily/weekly/monthly.
  - AI Search (Gemini 3 Flash via Emergent LLM Key).
  - AI Content Generator (description, SEO article, TikTok/IG/FB/Pinterest/X/Shorts, ad ideas, headlines, CTA).
  - AI Sales Strategist (heuristic + growth mode note).
  - AI Opportunity Score.
  - AI Daily Plan.
  - Quick Start checklist.
  - Subscribers.
  - 20 demo products seeded, flagged `is_demo=true`.
- Frontend React:
  - Public: Home, Deals, Search results, Category page, Product detail.
  - Admin: Login, Dashboard, Products (CRUD), AI Control (goal/mode/strategist/simulator/daily plan), AI Content, Networks, Reports.
  - Google fonts Outfit + Manrope, brand palette (Dark Navy / Green / Blue AI).

## Backlog (P1 / P2)
- P1: Favorites, Compare (up to 4), Deal Alerts, Blog/SEO articles publisher, Multi-country selector.
- P1: sitemap.xml, robots.txt, Schema.org JSON-LD on product pages.
- P2: Real affiliate feed importers (Amazon, Awin, CJ, Impact, Rakuten, eBay, AliExpress).
- P2: Google Analytics / Meta Pixel / TikTok Pixel toggles in Settings.
- P2: Email marketing integration + double opt-in.
- P2: Rate-limiting + audit logs.

## Env vars
- `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `EMERGENT_LLM_KEY`.
- Frontend: `REACT_APP_BACKEND_URL`.
