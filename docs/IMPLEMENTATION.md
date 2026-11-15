# Implementation handoff

Cloudflare hosting is now prepared locally. See [Cloudflare setup](CLOUDFLARE.md) and [latest verification](CLOUDFLARE-VERIFICATION.md); the storefront checks below describe the initial store implementation.

## What changed

- Preserved the original VERA logo, existing photography, Next.js App Router, React, TypeScript and Tailwind. Replaced Coming Soon with a responsive navy/off-white storefront, session-only logo reveal, homepage collections/arrivals/featured edit, brand story and Instagram links.
- Added all requested storefront/information routes, an honest empty pants collection, product pages with galleries/zoom/explicit colour families/sizes, search/filter/sort, persistent bag, mobile navigation and bag drawers, coupon fields and WhatsApp checkout.
- Added strict server pricing, integer-piastre amounts, HMAC coupon verifiers, PostgreSQL order/reservation transactions, idempotency and rate limits, Supabase owner sessions and protected order management.
- Added original configurable policy/FAQ copy, editable size tables, Custom Design Coming Soon, metadata, canonical URLs, structured product data, sitemap, robots, loading/errors and reduced-motion handling.
- Generated exactly 30 private owner coupon codes, ignored by Git and deploy packaging. No production database import has been performed.

## Source map

| Area                        | Created or modified files                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell/design            | `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/layout/*`, `components/Intro.tsx`, `components/ui/Modal.tsx`                                                       |
| Catalog                     | `scripts/generate-products.mjs`, `config/catalog.json`, `config/catalog-registry.json`, `lib/catalog.ts`, `components/products/*`                                                   |
| Shopping routes             | `app/shop/page.tsx`, `app/collections/[category]/page.tsx`, `app/products/[slug]/page.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `components/cart/*`                       |
| Information                 | `app/[info]/page.tsx`, `app/custom-design/page.tsx`, `config/brand.ts`, `config/content.ts`, `config/policies.ts`                                                                   |
| Backend                     | `app/api/quote/route.ts`, `app/api/checkout/route.ts`, `app/api/admin/*/route.ts`, `lib/db/client.ts`, `lib/http.ts`, `lib/auth/server.ts`, `lib/orders/*`, `lib/coupons/crypto.ts` |
| Owner dashboard             | `app/admin/page.tsx`, `components/admin/AdminDashboard.tsx`                                                                                                                         |
| Database/private operations | `supabase/migrations/001_store.sql`, `scripts/migrate.mjs`, `scripts/generate-coupons.mjs`, `scripts/coupon-status.mjs`, ignored `private/coupons.csv`                              |
| SEO/resilience              | `app/sitemap.ts`, `app/robots.ts`, `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`                                                                                          |
| Tooling/security            | `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `.vercelignore`, `.env.example`, `.prettierignore`, `AGENTS.md`          |
| Verification                | `vitest.config.ts`, `playwright.config.ts`, `tests/*`, `tests/e2e/*`, `scripts/test-server.mjs`                                                                                     |

`collection/` was already present locally and is retained without renaming. Generated public copies and catalog JSON are intentionally ignored and rebuilt. Existing `BrandLogo`, `InstagramLink`, `LaunchBackground`, dev script and PostCSS configuration were retained/formatted; the real logo component remains in use.

## External configuration still required

- A real Supabase project, production pooler credentials, project URL/public key, and stable production coupon HMAC secret.
- Apply the SQL migration, initialize the private 30-code batch and create/allowlist the owner account.
- Owner approval of reference prices, actual measurements, final return/refund/privacy terms and retention arrangements. No unsupported values are published.
- Confirm the existing Cloudflare Worker identity, configure Worker secrets, and follow the Cloudflare deployment guide. Smoke-test real Supabase login and order confirmation in staging before publishing.

The local disposable PostgreSQL instance and test coupon fixtures are not a production database and must never be deployed. The app does not fall back to them in production. The complete operational instructions and exact environment-variable names are in the README.

## Verification performed

- Production `next build`: passed; all six product pages, collection pages and informational pages generated, with server routes retained for secure operations.
- Strict TypeScript and ESLint: passed with no errors or warnings.
- Vitest: 25 tests passed, including real PostgreSQL lifecycle/concurrency tests on an isolated local instance. Eight simultaneous customers competing for one code produced exactly one order; concurrent retries of the same key produced one order.
- Playwright: six desktop/mobile shopping workflows passed, plus one additional responsive/navigation/filter test. Extra layout checks covered 320, 375, 768 and 1024 px, alongside the 390 px mobile and 1440 px desktop workflows. Product photos were checked for successful browser decoding.
- Private asset audit: exactly 30 codes with the required distribution; no plaintext code in 28 public/client files and no private/test files in server deployment traces. Git ignores the private CSV and local environment file.
- Dependency audit: zero known vulnerabilities after updating the development-only minimatch dependency through a scoped override.
- Supabase production authentication, production database setup and Cloudflare deployment: not performed; real account access is still required. Local order/coupon transactions and the browser-to-invoice path were exercised against PostgreSQL, not simulated by localStorage.

Run `node scripts/audit-private-assets.mjs` after a build to repeat the private-asset check. Browser screenshots and test traces are ignored local artifacts under `test-results/`.
