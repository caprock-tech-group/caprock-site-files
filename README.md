# Folio creator-store pilot

A working creator storefront with digital downloads, simple courses, bookings,
private delivery links, creator accounts, and eight researched comparison pages.

## Netlify deployment

- Next.js App Router with Netlify's automatic Next.js runtime.
- PostgreSQL via `@netlify/database`. Schema migrations are in
  `netlify/database/migrations/` and apply during deployment.
- Netlify Blobs for uploads. Production files persist across deployments;
  preview files use deploy-scoped storage.
- A fresh pilot database, independent of the earlier Sites deployment.
- Uploads are limited to 4 MB to fit the synchronous server request budget.

Run `npm ci`, `npm test`, and `npm run build`. Use `npx netlify dev` for local
platform emulation. The test suite uses actual PostgreSQL-compatible PGlite
queries and a local file-store substitute; live uploads must also be checked.

## Try the flow

Create a store or open an isolated demo studio. Edit a product, upload a file,
publish it, open the storefront, and complete free checkout. The private receipt
unlocks the uploaded download, course lessons with saved progress, or booking
with a calendar file. Demo previews are marked separately from sales.

## Payments and operational limits

Free checkout works without credentials. Paid checkout requires a Stripe Connect
platform account, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, connected-account
webhooks at `/api/webhook`, and creator onboarding. These secrets must be stored
in Netlify environment settings and never in source control. No test or live
Stripe credentials are configured by this migration. There is no fake payment
success. Tax, refund/dispute operations, subscriptions, and receipt email are not
configured. Accounts retain the existing salted password and hashed-session
implementation; email verification, MFA, and password recovery are not yet
available. This is a pilot, not a SOC 2-audited production service.
