# LandingAI — CLAUDE.md

## What this app does
LandingAI is an autonomous AI landing page builder for indie makers and solo SaaS founders. Users describe their product, the AI generates and publishes a complete landing page — no templates, no design skills required. $49/mo subscription gated by Stripe Checkout.

## Stack
Express.js + EJS templates + Neon PostgreSQL + Render + Stripe payments + OpenAI (via Polsia proxy)

## Directory map
- `server.js` — Express entry point, route mounts, middleware wiring (≤300 lines)
- `routes/` — Express routers: `briefs.js`, `dashboard.js`, `stripe.js`
- `db/` — Database modules: `index.js` (Pool singleton), `users.js`, `pages.js`
- `lib/` — Shared utilities: `agent.js` (OpenAI page generation), `landing-context.js`
- `migrations/` — SQL schema migrations, timestamp-prefixed
- `views/` — EJS templates + `partials/`
- `public/` — Static assets, CSS, generated pages under `pages/`

## Database
- `users` — email (unique), stripe_subscription_id, subscription_status (active/inactive), subscription_plan, subscription_expires_at, timestamps
- `pages` — uuid (unique), product_name, description, audience, cta_copy, status (pending/generating/shipped/failed), generated_url, timestamps

## External integrations
- **Stripe** — Payment link at `https://buy.stripe.com/aFa6oJ7dleLtchF3YQaR202` for $49 one-time purchase. Post-payment redirect to `/checkout/success`.
- **OpenAI** — Page generation via `lib/agent.js` using Polsia AI proxy.
- **Polsia Analytics** — slug=`landingai`, injected via `lib/landing-context.js`.
- **PostHog** — analytics tracking via `lib/analytics.js`. Env vars: `POSTHOG_API_KEY`, `POSTHOG_HOST`. Wires Meta Pixel events into PostHog funnel.
- **Meta Pixel** — ID `1273055144622924`, injected in `layout.ejs`. PageView wired to PostHog for unified funnel.

## Recent changes
- 2026-06-08: Add PostHog analytics (page views, CTA clicks, pricing funnel) wired to Meta Pixel
- 2026-06-08: Add email collection on pricing page, Stripe cookie-based flow for post-payment session verification, refactor shared pool into `db/index.js`
- 2026-06-06: Wire Stripe Checkout proxy for subscription gating
- 2026-06-06: Add users table with subscription fields, briefs routes with subscription gating
- 2026-06-05: Add pages table with status tracking and UUID-based brief submission