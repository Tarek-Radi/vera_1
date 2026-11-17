# VERA — Wear Your Identity

Project: https://vera1-sigma.vercel.app/

> Current hosting: **Vercel**. Use the Next.js preset and `npm run build`. See [Vercel artwork setup](docs/ARTWORK-DRIVE-SETUP.md) for required environment variables. Cloudflare Workers/OpenNext instructions below are historical alternatives, not this deployment’s runtime.


## Temporary database-free checkout (currently enabled)

`NEXT_PUBLIC_CHECKOUT_MODE=whatsapp` enables WhatsApp-only checkout. This is now the default in `config/checkout.ts` and explicitly selected in `wrangler.jsonc`. It requires no Supabase, `DATABASE_URL`, or `COUPON_HMAC_SECRET`. The database configuration instructions further below apply only when restoring `database` mode.

- Local Next.js: set `NEXT_PUBLIC_CHECKOUT_MODE=whatsapp` in `.env.local` and restart `npm run dev` (or rebuild a production build).
- Cloudflare: set `vars.NEXT_PUBLIC_CHECKOUT_MODE` to `whatsapp` in `wrangler.jsonc`, then `npm run build:cloudflare` and `npm run preview:cloudflare`. This public setting is compiled into both server and browser code; changing only a runtime secret is insufficient. Rebuild whenever switching modes.
- Check with `npm run checkout:check` or `npm run checkout:check -- --workers`. The selected mode checks the configured WhatsApp destination without initializing a database client.
- Destination remains `storeWhatsApp` in `config/brand.ts`: `201009785343`. Missing/invalid numbers fail validation; no alternative is invented.
- Once ready to publish later, confirm the existing Worker identity and HTTPS origins, then use `npm run deploy:cloudflare`. In WhatsApp mode it no longer requires Supabase public settings or database/coupon secrets. Nothing was deployed during this task.

The server validates customer details, catalog availability, quantity and size, and uses the real catalog selling price (including existing sale pricing). Browser prices/totals/shipping fees/customization charges are rejected. Shipping has no configured tariff and is clearly additional, “يُحدد بعد التأكيد”. Coupons, reservations and redemptions are disabled; coupon controls disappear and manually submitted codes are rejected. Old browser cart coupon selections are removed when loading this mode. Custom hoodie requests use the separate VERA Studio flow described below, with private Drive artwork uploads and prices confirmed on WhatsApp. The regular cart still rejects unsupported custom fields.

Orders are followed up **through WhatsApp only**. No order row, reference, central history or delivery confirmation is created. Admin order APIs and owner login are unavailable without exposing existing records or weakening authentication. Opening the chat never marks anything sent, confirmed or paid. The browser keeps the cart/customer draft for recovery; this is not a production order database. The customer must press Send in WhatsApp. Oversized messages retain the complete summary for copy/paste instead of silently dropping products.

To restore database-backed checkout, set the mode to `database` in `.env.local` and `wrangler.jsonc`, provide the existing database/Auth settings and unchanged coupon secret, apply required existing migrations, then rebuild and test. Existing code, migrations and database records are retained. Do not reinitialize issued coupons.

Verification: `npm test` covers credential-free pricing, Arabic/multiple items, invalid input, unsupported customization, missing destination and repeats; `npm run test:e2e:whatsapp` exercises actual workerd with empty database/coupon/Auth settings, coupon/admin rejection and intercepted same-tab WhatsApp navigation. Legacy database browser tests require a build in `database` mode and isolated PostgreSQL fixtures.


The existing VERA Next.js application, expanded into an Egyptian fashion store. The original logo and photography are preserved. The catalog comes from `collection/`, shopping bags persist in the browser, and a private PostgreSQL backend creates order requests and manages one-use coupon reservations. Customers send their own invoice through WhatsApp to **+201009785343**. No online payments are collected.

## Run locally

Use Node.js 24 LTS (or >=22.12) and npm.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. `predev` and `prebuild` generate the catalog automatically. Adding photos while the development server is already running requires `npm run catalog` or restarting it.

The storefront, search, filters, product pages, bag and regular price quotes work without external credentials. Coupons, saved orders and owner sign-in **fail closed** until the real services are configured. There is no fake successful checkout or localStorage coupon redemption.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

This is now a server-deployed Next.js app. **Do not deploy the old `out/` static export.**

## Environment variables

For normal Next.js development, copy `.env.example` to `.env.local` and fill it privately. For Workers preview, copy `.dev.vars.example` to `.dev.vars`; public build values live in `wrangler.jsonc`. Never commit credentials. See the Cloudflare section below.

| Variable                        | Purpose                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`          | Canonical origin, e.g. `https://quiet-disk-e80b.tarekradii64.workers.dev`; use your final domain in production.                |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL.                                                                                                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key for Auth. This is the public key, **not** a service-role key.                                    |
| `DATABASE_URL`                  | Private Supabase transaction-pooler PostgreSQL connection URI. URL-encode special password characters.                         |
| `DATABASE_SSL`                  | `require` in production; `disable` only for an isolated local test database.                                                   |
| `COUPON_HMAC_SECRET`            | Stable random server-only secret of at least 32 characters. Generate before importing coupons and back it up securely.         |
| `SITE_URL`                      | Runtime origin for API origin checks; match the public site URL in production and the browser origin in local Workers preview. |
| `VERA_RUNTIME`                  | Set to `cloudflare` by Wrangler; enables request-scoped database enforcement and trusted Cloudflare IP rate limiting.          |
| `TEST_DATABASE_URL`             | Optional, disposable local database named `vera_test`, used only by automated integration/E2E tests.                           |

Generate a production coupon secret once in a trusted local terminal:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Store it privately in `.env.local` for Node tooling, `.dev.vars` for isolated Workers preview, and a Worker secret for production. Changing it makes existing coupon verifiers unusable. Do not regenerate it on deploy. No Supabase service-role API key is required: private SQL handles store data, and Supabase Auth handles sign-in.

## Supabase setup

1. Reuse the existing Supabase project and database to preserve orders, issued coupons and owner accounts. Only create a Free project if no store database exists. Keep its database password private.
2. Copy the **transaction pooler** URI from the project's Connect panel into `DATABASE_URL`. The SQL client disables prepared statements. Each API request owns a single connection pool and closes it at completion, as required by Workers.
3. Set the project URL and publishable/anon key. Leave `DATABASE_SSL=require`.
4. For a fresh database only, apply `supabase/migrations/001_store.sql` using Supabase SQL Editor, or run (existing initialized databases need no schema/data migration for the hosting move):

   ```sh
   npm run db:migrate
   ```

5. All store tables have RLS enabled, no public policies, and revoked `anon`/`authenticated` table privileges. Never add customer read policies to coupons or orders. Store APIs use the private database connection.
6. Initialize the private coupon batch as described below.
7. Configure the owner account, then test a real owner login and a disposable order in your staging environment before launching publicly.

Migration creates `orders`, `order_items`, `coupons`, `coupon_reservations`, `admin_users`, `order_events`, and `rate_limits`, plus constraints and indexes. Monetary values are integer **piastres**, not floating-point EGP. Orders record the SKU, name, colour, size, quantity, selling price, actual coupon discount and final amount at checkout.

## Owner account and administration

1. In Supabase Authentication, disable public sign-ups. Create an owner user with email/password and confirm that user's email in the dashboard. Use a strong unique password. Configure the Supabase Site URL for the production domain.
2. Copy that user's UUID from Authentication → Users.
3. Add the UUID through the trusted SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('REPLACE-WITH-THE-AUTH-USER-UUID')
   on conflict do nothing;
   ```

4. Visit `/admin` and sign in. The server validates the session with Supabase `getUser()` and independently checks `admin_users` on **every** protected operation. Passwords are never stored in this application. Session cookies are HTTP-only, SameSite Lax and Secure in production.
5. View the latest 100 orders, filter by status, inspect items/coupon reservations/history, confirm or cancel requests, and mark confirmed orders fulfilled.

Confirm an order only after the customer actually sends the WhatsApp message and you agree on the order. Confirmation permanently redeems the reserved coupons. Cancellation of a pending order releases its reservations. Cancellation of an already confirmed order does **not** restore redeemed codes. Payment and shipping remain `UNCONFIRMED`; fulfilment is not a payment receipt.

Remove an owner by deleting their UUID from `admin_users` and revoking their Supabase session. Manage account recovery through Supabase; no public registration/reset flow is exposed by the storefront.

## Private coupons — exactly 30

The implementation has generated `private/coupons.csv` locally. It contains `code,discount_percent,status`, with 10 codes at each of 15%, 20%, and 30%. **Open this file locally; never publish it.** Its plaintext is ignored by Git and excluded from Workers packaging and excluded from Next.js output tracing.

```sh
# Only if the private CSV does not already exist:
npm run coupons:generate

# After migration and environment configuration:
npm run coupons:init

# Refresh the private CSV's status column from the database:
npm run coupons:status
```

Generation uses 96 bits of cryptographic randomness per code and exclusive file creation. It refuses to replace an existing batch. Initialization sends HMAC-SHA256 verifiers to PostgreSQL, never the plaintext list. Re-running initialization preserves reservation/redemption states and refuses a different batch or mismatched secret. The private CSV is an owner snapshot, **not** the authority; refresh statuses before distributing codes. Back up the CSV and HMAC secret securely outside public source control.

### Coupon rules and expiry

- One code per bag line, including all units on that line. A code cannot apply to multiple lines. Different lines may have different codes.
- Coupon arithmetic uses the selling price. Example: 600 EGP × 15% = 90 EGP savings, total 510 EGP. A compare-at price is never used in checkout.
- Applying a code previews a server-calculated quote; it does not reserve the code.
- Creating an order atomically reserves the coupons for **30 minutes**, configured in `config/brand.ts`.
- Confirmation changes `AVAILABLE → RESERVED → REDEEMED`. Cancellation releases a still-reserved coupon. Expiry records `EXPIRED` on the reservation/order and returns its coupon to `AVAILABLE`. A redeemed coupon is never automatically released.
- Expiry is enforced before every coupon quote, checkout, owner listing and order mutation. No scheduler is needed for correctness: an idle database may still display a stale `RESERVED` status until the next lifecycle operation, but an expired coupon can be claimed safely on that next request. Refresh `/admin` before exporting coupon statuses to materialize expiry.
- PostgreSQL transactions, a shared transaction advisory lock and a unique live-reservation index prevent simultaneous use across Vercel instances. This deliberately serializes the small store's lifecycle writes. For much higher traffic, refactor to ordered row locking after adding equivalent contention tests.

## WhatsApp checkout and retries

The final **Complete order via WhatsApp** button validates required name, mobile, governorate, city/area and full address, then creates/reuses the pending order through the existing server-priced PostgreSQL flow. Optional payment preference and notes are included. It immediately navigates the same tab to a fully encoded Arabic WhatsApp summary. The customer still must press **Send**; opening WhatsApp does not mark anything sent, paid or confirmed.

**Owner number:** edit `storeWhatsApp` in `config/brand.ts` (currently `201009785343`, reused from the existing store). It is normalized and validated centrally; use an international country code without a leading zero. Rebuild after changing it.

**Database prerequisite:** before using this checkout on an existing store, back up the database and apply the additive `supabase/migrations/002_checkout_customer.sql`, or run `npm run db:migrate` from the trusted local environment pointing at the correct database. The migration adds nullable customer details; it does not delete/backfill old orders or reset coupons. Migration was exercised only on isolated localhost test data. No production migration/deployment was performed.

The summary uses persisted item prices, quantities, colors, sizes, actual discounts and the submitted coupon only after validation. No SKU/technical IDs are included. Shipping remains **يُحدد بعد التأكيد** because no approved shipping tariff exists; the amount is explicitly before shipping. Payment preference is a request, not payment acceptance or proof of payment.

Requests persist an idempotency key before the network call, covering both items and validated customer details. Concurrent identical retries reuse one record. The cart is retained; form and prepared summary are saved in this tab's session storage for return/reload. **فتح واتساب** and **نسخ تفاصيل الطلب** provide fallbacks; clipboard denial selects the full message for manual copying. Above a conservative 8,000-character encoded-link threshold, no product is dropped: the complete summary remains available to copy, with instructions to paste it into the plain owner chat.

Custom design remains the existing Coming Soon page. There is no priced customization or uploaded-design storage in this repository. Unsupported printing/charge/design fields are rejected by strict server validation, rather than accepting unpriced customization or unusable local/blob references.

Checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run build:cloudflare`, and `npm run test:e2e:cloudflare` with an isolated localhost `vera_test` database. Browser tests intercept WhatsApp navigation; no real messages are sent. Real Supabase owner authentication and live database connectivity still require account configuration.

## Managing product images

Keep original filenames; no renaming is needed:

```text
collection/
  black_Hijab_250.jpeg
  black_hoodie_600.jpeg
  burgundy_Hijab_250.jpeg
  burgundy_hoodie_600.jpeg
  gray_hoodie_600.jpeg
  some-Hoodies.jpeg
  white_Hijab_250.jpeg
```

Add a `color_productType_price` JPEG, JPG, PNG, WebP or AVIF image, then rebuild/redeploy. Parsing is case-insensitive; prices support up to two decimal places. The generator copies images into hashed safe paths under `public/catalog/` and writes `generated/catalog.json`. Root folders are not assumed to be public. Invalid names warn and are skipped. Missing/empty collections still build. Symlinks are skipped and metadata gallery paths cannot escape `collection/`.

`some-Hoodies.jpeg` is explicitly promotional, never purchasable. Add other promotional filenames in `config/catalog.json`. Pants currently has no products and shows Coming Soon.

### Identity, models and galleries

Default identity is `relative-directory/color_productType` without price or extension. SKUs derive from this identity using a deterministic hash, never enumeration order. A price change or new image does not change existing SKUs. `config/catalog-registry.json` records stable SKUs/slugs and the real first catalog-generation timestamp. **Commit this registry** with product changes; it supplies the New Arrivals ordering without pretending to know an earlier arrival date.

For a new model, use a nested folder, for example `collection/zip-up/black_hoodie_800.jpeg`. Its metadata key becomes `zip-up/black_hoodie`. Families merge only when explicitly configured; new hoodie models are not automatically combined. For a deliberate rename or move, preserve `id`, `sku` and `slug` in metadata or keep the existing stable identifier. Duplicate identifiers/SKUs/slugs fail the build rather than creating ambiguous orders.

In `config/catalog.json`, edit `products` by identity:

```json
{
  "black_hoodie": {
    "id": "black_hoodie",
    "family": "signature-hoodie",
    "featured": true,
    "available": true,
    "sizes": ["S", "M", "L", "XL", "XXL"],
    "description": "Your approved product description.",
    "compareAtPrice": 650,
    "referencePriceApproved": false,
    "images": ["details/black-hoodie-back.jpg"]
  }
}
```

Optional `name`, `sku`, `slug`, and `id` overrides are supported. Gallery images listed in metadata are copied and excluded from standalone product parsing. Sizes and availability are configurable; no invented inventory count is displayed. Mark a product unavailable instead of removing its image when you want its page to remain accessible.

### Reference prices

The hoodie category suggests selling price + 50 EGP, but `referencePriceApproved` defaults to **false**. Publish 650 EGP crossed out beside a 600 EGP selling price only after verifying that 650 is a genuine regular/reference price and setting approval to true. Approval can be per product or category. Invalid or lower reference prices are hidden. This never changes checkout/coupon calculations.

### Other owner-editable settings

| File                           | Settings                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `config/brand.ts`              | Brand, WhatsApp, Instagram, homepage copy, canonical fallback, reservation duration.                                         |
| `config/catalog.json`          | Category mapping, SKU prefixes, sizes, descriptions, families, availability, features, approved reference prices, galleries. |
| `config/catalog-registry.json` | Persistent generated identity/first-seen mapping; keep tracked.                                                              |
| `config/policies.ts`           | Return/refund values, policy approval, delivery/privacy wording and size measurement tables.                                 |
| `config/content.ts`            | Original FAQ and information-page text.                                                                                      |
| `app/globals.css`              | Navy/blue/off-white design tokens and responsive styles.                                                                     |

No return window, refund deadline, delivery charge, exact size measurement, store address, support hours, sales count or review has been invented. Return/terms/privacy content remains explicitly awaiting owner review. Have the final business policies reviewed against applicable Egyptian consumer-protection requirements before publishing them as final terms. Add approved size-chart rows and set actual values in configuration. The site is English with UTF-8/Arabic-capable font fallback and document direction declared; a full Arabic translation and RTL layout are future work.

## Cloudflare Workers deployment

The stale `out/` directory explains the old Coming Soon site: current `next build` does not regenerate that earlier static export. The complete store needs its server runtime. **Do not upload `out/` or raw `.next/`.** OpenNext now packages `.open-next/worker.js` plus `.open-next/assets`, including all dynamic APIs and current catalog images.

PowerShell, from this repository:

```powershell
npm ci
npm run build:cloudflare
npm run check:cloudflare
npm run preview:cloudflare
```

Preview opens at **http://127.0.0.1:8787** in the real local Workers runtime. `check:cloudflare` is a local dry run. Stop preview with Ctrl+C. The build explicitly generates products/promotional assets before OpenNext; it does not depend on an adapter invoking npm's prebuild hook. Normal `npm run dev` remains available.

For local server features, `Copy-Item .dev.vars.example .dev.vars` and fill isolated staging/local database and HMAC values. Set `SITE_URL` to the preview browser origin. Public Supabase URL/key go in `wrangler.jsonc`; rebuild after public settings change. Missing database/Auth credentials fail closed. Never use production data for automated tests.

The reported current site is `https://quiet-disk-e80b.tarekradii64.workers.dev/`. No authenticated Cloudflare identity was available, so the configuration contains an explicit placeholder. To publish **later**, first run `npx wrangler login` and `npx wrangler whoami`, confirm the existing Worker and account in the dashboard, then set its exact `name`, `account_id` and matching `WORKER_SELF_REFERENCE` in `wrangler.jsonc`. Set both site URL variables to the existing HTTPS origin and the existing Supabase public Auth values. Do not create a new Worker.

Only after confirming that target, the future remote setup/deployment commands are:

```powershell
npx wrangler deployments list
npx wrangler secret list
# Only if missing/incorrect; enter existing secrets interactively, never as arguments:
npx wrangler secret put DATABASE_URL
npx wrangler secret put COUPON_HMAC_SECRET
npm run deploy:cloudflare
```

The deploy script checks an existing deployment and required secret names, rebuilds fresh, dry-runs and then uses OpenNext to update the **same Worker**. Reuse this exact configuration/command for subsequent source/catalog changes. Keep the existing PostgreSQL database and HMAC secret; no D1 or data conversion is required. For fresh database initialization only, use `npm run db:migrate` and `npm run coupons:init` from a trusted local terminal. Never reinitialize issued coupon codes during deployment.

[Full Cloudflare setup, Windows/WSL commands, secret handling, storage audit/migration and free-tier limits](docs/CLOUDFLARE.md) and [actual verification results](docs/CLOUDFLARE-VERIFICATION.md) are documented separately. Native Windows builds/preview worked here; OpenNext recommends WSL if native tooling fails. Images use original static assets without paid optimization, and prerendered pages use a bundled read-only cache. No paid resources are configured. Free-tier CPU/request/database limits still apply and require monitoring; local preview does not prove production CPU compliance.

**This task prepared and tested locally only. Nothing was published, no billing was enabled, and no live database was modified.** Real owner login and production connection/CPU checks require the existing service configuration.

## Tests

`npm test` runs parsing, stable identity, missing/new image, approval-gated pricing, strict input, coupon generation and invoice tests. Real PostgreSQL lifecycle tests run only when `TEST_DATABASE_URL` is set; otherwise they are explicitly skipped. These tests wipe **only** a database whose name is `vera_test`; use a dedicated disposable local instance.

PowerShell example with a local test database:

```powershell
$env:TEST_DATABASE_URL = 'postgres://vera_test@127.0.0.1:55439/vera_test'
npm test
npm run build
npm run test:e2e
# Actual Workers runtime (after a Cloudflare build):
npm run build:cloudflare
npm run test:e2e:cloudflare
```

E2E fixtures additionally require the host to be localhost/127.0.0.1. They create test-only coupon codes, never import `private/coupons.csv`, and launch the production build at port 3100. Playwright uses installed Microsoft Edge, with desktop and iPhone-sized Chromium viewports. On another machine install Edge or change `channel` to an installed browser; for bundled Chromium remove `channel` and run `npx playwright install chromium`.

Database tests cover simultaneous coupon contention, invalid codes, per-line discounts, retry idempotency, expiry, cancellation, permanent redemption, fulfilment and order history. Browser tests cover routes, image loading, search/empty states, FAQ, size selection, drawer, quantity/size edits, persistence, coupons, invoice contents, retries, forbidden origins, price injection, inaccessible private files and anonymous admin protection. External Supabase sign-in needs a separate staging smoke test with your actual owner account.

## Troubleshooting

- **Checkout says setup is in progress:** configure `DATABASE_URL`; coupons also need the HMAC secret and imported verifiers. Owner sign-in additionally needs Supabase URL/key and membership.
- **Valid code is unavailable:** it may be reserved, redeemed, or imported under a different HMAC secret. Inspect `/admin`; do not manually reset redeemed codes.
- **Invoice retry after expiry:** the old order cannot be confirmed. Reopen checkout, acknowledge expiry and create a new request. Never create a second request just to reopen WhatsApp.
- **Products missing:** run `npm run catalog` and read warnings. Check category spelling and the underscore-separated price. New categories need a mapping. Duplicate filenames for the same identity need distinct model folders or metadata gallery entries.
- **Product photo missing after deployment:** include source photos in Git; use `npm run build:cloudflare` followed by the guarded deployment command, not a static upload or an old `out/` directory.
- **Owner account denied:** ensure the Auth UUID is in `admin_users`, email is confirmed and the environment points to the correct Supabase project. Public Auth users are not automatically administrators.
- **Database connection error:** use the correct pooler URI, URL-encoded password, SSL and migrations. No raw database errors or credentials are returned to customers.
- **Rate limit during local tests:** local traffic shares a bucket. Use the E2E fixture setup or wait a minute. Do not weaken production rate limiting to fix tests.
- **Private CSV already exists:** this is intentional protection. Back it up; do not generate a replacement batch or change the HMAC secret after issuing codes.

See `docs/IMPLEMENTATION.md` for the source map, verification results and remaining launch configuration.

### Diagnosing “Online checkout is being set up”

This exact error is thrown by `lib/db/client.ts` when `DATABASE_URL` is absent. WhatsApp navigation occurs only after the order is saved; this is not a popup problem. Never bypass the database write to remove the message.

For local Next.js, copy `.env.example` to `.env.local`. For local Workers preview, copy `.dev.vars.example` to `.dev.vars`. Fill the existing store's `DATABASE_URL` (Supabase transaction-pooler connection string), `DATABASE_SSL=require`, and the existing `COUPON_HMAC_SECRET` (at least 32 characters, matching imported coupon verifiers). Do not generate a replacement secret for already issued coupons. Restart the local server after setting values.

Run `npm run checkout:check` for Next.js or `npm run checkout:check -- --workers` for local workerd. This reports missing variable names, checks connectivity/schema without changing records, and never prints secrets. It does not inspect deployed Cloudflare secrets. Apply the existing SQL migrations, including `002_checkout_customer.sql`, with `npm run db:migrate` from a trusted terminal configured for the intended database. Back up existing data first.

For Cloudflare production, first confirm the existing Worker name/account in `wrangler.jsonc`; its current placeholder must not be used. Then configure that Worker's **Settings → Variables and Secrets**:

- Secret `DATABASE_URL`: the existing production transaction-pooler URI.
- Secret `COUPON_HMAC_SECRET`: the existing coupon verifier secret.
- Variable `DATABASE_SSL`: `require` (already in Wrangler config).
- Variables `SITE_URL` and `NEXT_PUBLIC_SITE_URL`: the actual HTTPS store origin.

Alternatively, after confirming the correct Worker, run `npx wrangler secret put DATABASE_URL` and `npx wrangler secret put COUPON_HMAC_SECRET`, entering values interactively. These are remote changes for the owner to perform later; this task did not upload secrets or deploy. Public Supabase URL/key settings are additionally needed for owner authentication, not for the ordinary database-backed WhatsApp checkout.

The destination is already configured as `201009785343` in `config/brand.ts` (`storeWhatsApp`). No replacement number is required. Once storage is configured, the existing final button saves/reuses the validated order and navigates directly to the prefilled Arabic message in the same tab. Customers press Send only inside WhatsApp. Cart/details remain recoverable on errors; failed quote validation now offers **Retry validation**.


## Custom Your Design — sequential Drive uploads

The custom hoodie flow is separate from the cart and requires no database or Turnstile. It uploads images sequentially with a waiting spinner and image counter, retains each saved result for retries, and opens WhatsApp in the same tab only after all files are confirmed. The message contains real Drive links and image codes. The customer still presses Send.

[Required Vercel and Google Apps Script setup](docs/ARTWORK-DRIVE-SETUP.md): configure `ARTWORK_SCRIPT_URL`, `ARTWORK_SCRIPT_SECRET`, `SITE_URL`, and `ARTWORK_MAX_BYTES`. The destination is `1IS01GtI2kiI5LFOVb1IaO_pAkfZFx1iT`. Use `npm run build` for Vercel. No Turnstile keys are needed.

Tests mock Google responses; live uploads require the owner’s Google authorization and configuration. No deployment is automatic.
