# Netlify pilot validation — October 4, 2026

Production URL: https://folio-caprock-pilot.netlify.app/

- Next.js TypeScript check passed. Full local Netlify build passed, including the Next.js server function.
- Production deployment succeeded with the Next.js server handler and routing rules deployed.
- 12 proxy checks passed: cross-origin rejection, internal runtime URL handling, server-only service authorization, client-header replacement, cookies, uploaded bytes, cache safety, and backend failure handling.
- 40 checks passed against the live Netlify production URL and real isolated D1/R2 storage: registration, password login/logout, duplicate handles, private account access, ownership, CSRF, CSV upload and exact-byte fulfillment, course content/progress, concurrent booking conflict, calendar delivery, payment gating, isolated demo previews, and persistent order history.
- 19 live pages rendered, including all eight comparisons. Unique titles, descriptions, Open Graph tags and canonical URLs checked. Comparisons include Product, FAQPage and BreadcrumbList structured data. Sitemap, robots and unknown-page 404 checked.
- Browser verified landing, sample storefront, checkout and receipt. A free example checkout produced a private access link. Deployment screenshot: `netlify-pilot.jpg`.
- Test storefronts were unpublished after verification. The fictional Maya sample remains published.
- Backend is a separate owner-private API with independent D1 and R2 resources. The original Folio Site's audience and data were preserved. A platform service credential connects the Netlify server; app sessions and ownership checks remain required for protected actions.
- The Free plan rejected environment-variable scope restrictions. The server credential is stored in Netlify's encrypted environment configuration with the plan's required all-scope/context setting; it is never exposed through NEXT_PUBLIC variables, code or browser responses.
- GitHub stores the pilot on the `folio-netlify-pilot` branch in `caprock-tech-group/caprock-site-files`. Production is deployed through the authorized connector upload; automatic Git-triggered deployment is not configured.
- Stripe credentials are not connected. Free fulfillment works; paid transactions remain gated and were not tested against Stripe. Email delivery, password recovery, MFA and SOC 2 certification remain outside this pilot.
- Mobile visual QA, search ranking and rich-result eligibility were not independently verified in this deployment repair.
