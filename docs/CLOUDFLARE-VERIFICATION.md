# Local Cloudflare verification — 2026-11-15

The existing store was prepared for Cloudflare Workers locally on Windows. No production deployment, secret upload, resource creation, billing change or live database write was performed. The old `out/` directory was left untouched and ignored; the documented workflow cannot select it.

## Implemented files

- `package.json` / lockfile: pinned compatible Next/OpenNext/Wrangler versions, build/preview/check/deploy/Workers-test commands, scoped patched build dependencies.
- `wrangler.jsonc`, `open-next.config.ts`: Worker entry point and assets, compatibility flags, self-reference, read-only prerender cache, explicit unconfirmed identity placeholder.
- `scripts/cloudflare.mjs`, `scripts/read-cloudflare-config.mjs`: explicit catalog generation before adapter compilation, local cache population, dry run, guarded same-Worker deployment with fresh rebuild and required-secret-name checks.
- `next.config.ts`, `public/_headers`: original security settings retained; original images served as static assets on Cloudflare without paid transformations.
- Three generated route pages (`app/[info]`, `app/products/[slug]`, `app/collections/[category]`): only generated slugs are served; unknown slugs return 404 without attempting on-demand generation into the read-only cache. All existing catalog/information pages remain.
- `lib/db/client.ts`, `lib/http.ts`, `app/api/*`: request-scoped PostgreSQL connections, cleanup, Cloudflare IP rate limiting, runtime origin configuration; existing pricing/auth/order/coupon logic retained.
- `.env.example`, `.dev.vars.example`, ignore/type/lint settings: placeholder configuration and generated/private-file exclusion.
- `playwright.cloudflare.config.ts`, `scripts/test-cloudflare-server.mjs`, `tests/e2e/cloudflare.spec.ts`: real workerd tests with a separate ignored config and guarded localhost PostgreSQL fixtures.
- `scripts/audit-private-assets.mjs`: private-code audit also scans the OpenNext output.
- `README.md`, `docs/CLOUDFLARE.md`: current setup, same-site deployment, Windows/WSL fallback, existing-data preservation and realistic free limits.

## Verification

| Check                                | Result                                                                                                                                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal `npm run dev`                 | Ready on Windows; latest homepage returned 200                                                                                                                                                                                                           |
| Normal `npm run build`               | Passed; dynamic server routes retained                                                                                                                                                                                                                   |
| `npm run typecheck` / `npm run lint` | Passed                                                                                                                                                                                                                                                   |
| `npm test` with local PostgreSQL     | 25 passed, including transaction, coupon contention, idempotency, cancellation, expiry, redemption and fulfilment checks                                                                                                                                 |
| `npm run build:cloudflare`           | Actual OpenNext build passed on native Windows; generated six products and one promotional image first                                                                                                                                                   |
| `npm run check:cloudflare`           | Local Wrangler dry run passed; about 6.78 MiB uncompressed / 1.46 MiB gzip, 92 assets                                                                                                                                                                    |
| `npm run preview:cloudflare`         | Actual local workerd served the current homepage, shop, collections, cart, checkout, custom design and admin shell                                                                                                                                       |
| `npm run test:e2e:cloudflare`        | 8 passed; 2 intentional skips of viewport-independent checks duplicated in the mobile project                                                                                                                                                            |
| Browser checks                       | Desktop/mobile layouts, 320/375/768/1024 px widths, navigation, generated product pages, image decoding, search/filter/sort, cart persistence/edits, custom-design page, FAQs and information pages                                                      |
| API/storage checks                   | Real quote and checkout requests, correct integer totals/discounts, persisted PostgreSQL order row, separate order creation, same-order retry across HTTP requests, WhatsApp invoice/reopen flow, forged price rejection and disallowed-origin rejection |
| Anonymous owner access               | Protected GET and POST rejected with 503 `NOT_CONFIGURED` because external Auth settings are intentionally absent; no order data returned. Invalid session input rejected with 400                                                                       |
| Privacy                              | `.env.local` and private CSV URLs returned 404. Audit found no private coupon plaintext in public/client/Workers output; traced private/test files excluded. Ignore rules verified                                                                       |
| Dependencies                         | `npm audit` and production dependency audit reported zero known vulnerabilities                                                                                                                                                                          |

The PostgreSQL fixture is a separate local cluster on `127.0.0.1:55439`, database `vera_test`; only fixture tables/data were touched. Worker tests use port 8788 and do not load the root `.dev.vars`. Server-side checkout was not mocked. Private issued coupon codes were never used in tests or printed.

Additional checks passed against the default `preview:cloudflare` command without any database credentials: correct regular-price quote (200), disallowed origin (403), checkout without persistence (503), and unknown information/product/collection paths (404). The final unknown-route checks produced no read-only-cache write warnings. The unconfigured deploy guard was also exercised and refused the placeholder before any remote operation.

## Remaining external prerequisites

1. **Existing Worker identity:** Wrangler `whoami` reports unauthenticated. No existing name/account ID was present in repository config. Confirm the account and existing Worker serving the user-provided URL before filling the placeholder. The publishing portion of the deploy script was not executed.
2. **Real Supabase configuration:** production/staging SQL TLS/pooler connectivity, owner sign-in/session refresh/sign-out and authenticated admin actions need the existing project's credentials and owner membership. Local SQL lifecycle tests do not substitute for a real Auth smoke test. Anonymous fail-closed behavior was tested; configured-Auth 401/403 behavior was not exercised end-to-end.
3. **Production limits:** workerd preview does not verify Cloudflare Free's production CPU allowance, startup or account-specific request quotas. No live load test was performed. Monitor those before relying on Free for traffic; do not enable billing automatically.
4. **Custom design:** the existing feature is a Coming Soon page. There is no upload/editor service in this repository; none was removed, simulated or claimed to have been implemented by the deployment fix.
5. **WSL:** exact fallback instructions are provided, but the successful adapter/runtime verification used native PowerShell.

Use the commands in [the deployment guide](CLOUDFLARE.md) to repeat local checks. Future publishing should reuse the confirmed existing Worker and the same PostgreSQL/Auth project and stable coupon secret.
