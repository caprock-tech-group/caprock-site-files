# Folio creator-store pilot

A working creator storefront with digital downloads, simple courses, bookings,
private delivery links, creator accounts, and eight researched comparison pages.

## Netlify deployment

- Next.js App Router, packaged with an explicit `@netlify/plugin-nextjs` build plugin.
- Netlify serves the UI and same-origin server API routes.
- A separate private Worker API provides isolated SQLite (D1) records and R2 uploads.
  Its source is in the dedicated backend source repository; no data is shared with
  the earlier Folio Site.
- The API service credential is stored only in Netlify's encrypted server environment variable
  `FOLIO_BACKEND_TOKEN` (the Free plan requires all scopes and contexts). Never put it in browser code or Git.
- Browser sessions remain HttpOnly cookies on the Netlify domain. User ownership and
  purchased-content authorization are enforced by the backend. Mutation origins are
  checked against the configured public pilot URL by both server layers.
- Uploads are limited to 4 MB to fit Netlify's synchronous request budget.
- Netlify Database requires a credit-based team plan; the pilot avoids changing the
  existing team's billing. The unused PostgreSQL migration is archived for a future
  database migration. No relational state is stored in object-storage blobs.

Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.
Run `node tests/live-flow.mjs` only against the designated pilot: it creates test
accounts, files, products and orders, then unpublishes the test storefronts.

## Try the flow

Create a store or open an isolated demo studio. Edit a product, upload a file,
publish it, open the storefront, and complete free checkout. The private receipt
unlocks the uploaded download, course lessons with saved progress, or booking
with a calendar file. Demo previews are marked separately from sales.

## Payments and operational limits

Free checkout works without credentials. Paid checkout requires a Stripe Connect
platform account, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, connected-account
webhooks at `/api/webhook`, and creator onboarding. These Stripe secrets must be stored
in the private backend environment settings and never in source control. No test or live
Stripe credentials are configured by this migration. There is no fake payment
success. Tax, refund/dispute operations, subscriptions, and receipt email are not
configured. Accounts retain the existing salted password and hashed-session
implementation; email verification, MFA, and password recovery are not yet
available. This is a pilot, not a SOC 2-audited production service.
