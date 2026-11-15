# Cloudflare Workers deployment

## Why the old page appeared

`out/` belongs to an earlier static export. `next build` now creates `.next/`, retains server routes and does not refresh `out/`. Uploading that old directory therefore publishes the old Coming Soon page. Neither directory is a complete Workers deployment.

The supported path is **catalog generation → Next build → OpenNext → Worker plus assets**. `build:cloudflare` explicitly runs `scripts/generate-products.mjs` before the adapter. It then populates the read-only prerender cache into `.open-next/assets`. The only deployment entry point is `.open-next/worker.js`, together with `.open-next/assets`. No static export is enabled.

## Compatibility and architecture

Verified on 2026-11-15: Next **16.4.5**, `@opennextjs/cloudflare` **1.20.17**, Wrangler **4.162.0**, Windows Node **24.14.0**. The adapter's installed Next peer range is `>=15.5.29 <16 || >=16.4.5`. The app keeps the Node runtime, App Router and every existing route. See [Cloudflare's Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) and [OpenNext's supported versions and Windows guidance](https://opennext.js.org/cloudflare).

`wrangler.jsonc` uses `nodejs_compat`, `global_fetch_strictly_public`, compatibility date `2026-11-01`, an `ASSETS` binding and a self-reference service binding. There are **no D1, R2, KV, Images, Hyperdrive, queue or Durable Object resources to create**. OpenNext may export unused Durable Object classes in its generated bundle; none are bound or provisioned.

- Prerendered catalog/information pages use OpenNext's [read-only Static Assets cache](https://opennext.js.org/cloudflare/caching). Catalog changes require rebuilding. This store does not use ISR or `revalidateTag`; adding those later requires reconsidering the cache configuration.
- `/shop`, `/admin` and all API handlers remain dynamic. Order responses use `no-store`. The cache holds build-time pages, never order records or owner sessions.
- Cloudflare builds set `next/image` to `unoptimized`. The actual small JPEG/WebP assets are served by Static Assets; dimensions, layout and lazy loading remain. Normal `next dev`/`next build` retain the existing optimizer. There is no paid Images binding or runtime `sharp` processing. [OpenNext image options](https://opennext.js.org/cloudflare/howtos/image).
- `next.config.ts` security headers remain. `public/_headers` applies them to assets too, since asset requests can bypass the Worker.
- The scoped build-tool overrides use patched glob/minimatch versions. `npm audit` reported zero vulnerabilities after installation.

## Build and local preview — PowerShell

Use Node 24 LTS (or Node >=22.12 supported by Wrangler) and run from this repository:

```powershell
npm ci
npm run dev
# Stop dev with Ctrl+C when done.
npm run typecheck
npm run lint
npm run build
npm run build:cloudflare
npm run check:cloudflare
npm run preview:cloudflare
```

Open **http://127.0.0.1:8787**. The last command runs local **workerd**, not `next dev`, and does not publish anything. `check:cloudflare` is Wrangler's `deploy --dry-run`; it only bundles locally. Stop preview with Ctrl+C before rebuilding. Rebuild after changing source/catalog/public configuration. `preview:cloudflare` previews the last successful adapter build.

For local checkout/coupons, copy the example and use an **isolated test/staging database**, because preview writes real order rows:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Fill `DATABASE_URL`, `DATABASE_SSL`, `COUPON_HMAC_SECRET` privately. Keep `SITE_URL` equal to the browser origin (`http://127.0.0.1:8787`). Use `DATABASE_SSL=disable` only with a disposable local database. For real staging Auth, set the existing project's public URL and anon/publishable key in `wrangler.jsonc` and rebuild. With missing credentials the existing checkout/Auth handlers return setup errors; they do not simulate success.

Normal Node development reads `.env.local`; Workers preview reads `.dev.vars`. Keep server credentials out of `NEXT_PUBLIC_*` and `wrangler.jsonc.vars`. Do not use a Supabase service-role key in either public field. `.env*`, `.dev.vars*`, private coupons, `.local/`, `.open-next/` and `.wrangler/` are ignored; only placeholder example files are tracked. Keep builds local/private: adapters can copy `.env` fallback values into server bundles, so production secrets should be Worker secrets and local Workers secrets should be in `.dev.vars`.

## Windows and optional WSL fallback

The native PowerShell adapter build and workerd preview were exercised successfully on this machine. OpenNext recommends WSL because full native Windows support is not guaranteed. WSL is a fallback here, not a prerequisite for normal `npm run dev`.

From PowerShell, enter an installed Ubuntu distribution:

```powershell
wsl -d Ubuntu
```

Inside **Ubuntu/bash**, install a Linux Node 24 LTS runtime using your normal Node installer (if nvm is installed: `nvm install 24; nvm use 24`). Verify `node --version` and `command -v node`; do not use Windows Node/npm from `/mnt/c/Program Files`. Then copy current source, including uncommitted changes, into the Linux filesystem:

```bash
mkdir -p ~/vera-launch-wsl
rsync -a \
  --include=.env.example --include=.dev.vars.example \
  --exclude=node_modules --exclude=.git --exclude=.next \
  --exclude=.open-next --exclude=.wrangler --exclude=.local \
  --exclude=out --exclude=private --exclude='.env*' --exclude='.dev.vars*' \
  --exclude=test-results --exclude=playwright-report \
  /mnt/e/hossam/vera-launch/ ~/vera-launch-wsl/
cd ~/vera-launch-wsl
npm ci
cp .dev.vars.example .dev.vars
# Fill only isolated local/staging secrets if needed.
npm run build:cloudflare
npm run check:cloudflare
npm run preview:cloudflare
```

Do not share `node_modules`, `.next`, `.open-next` or native binaries between Windows and Linux. The WSL fallback itself was not executed; the verified path was native PowerShell. Tests using PostgreSQL in WSL need a localhost test database inside that environment.

## Existing data and runtime audit

| Area                                                                   | Storage/runtime behavior                                                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orders, lines, history, coupons, reservations, membership, rate limits | Existing PostgreSQL tables; no process-memory or filesystem fallback                                                                                 |
| Database driver                                                        | Postgres.js 4.1.1 has a workerd transport using `cloudflare:sockets`; one client per API request, closed on completion; prepared statements disabled |
| Prices and discounts                                                   | Bundled catalog, server validation, integer piastres, HMAC verifiers and database transactions/advisory locks; client prices rejected                |
| Retries/expiry                                                         | Stored idempotency hashes and order records; reservation expiry/cancellation/redemption semantics preserved                                          |
| Owner sessions                                                         | Existing Supabase Auth `getUser()` plus independent `admin_users` membership; HTTP-only, SameSite Lax, Secure production cookies                     |
| Rate limiting                                                          | Durable PostgreSQL counters; trusts Cloudflare's `CF-Connecting-IP` only under `VERA_RUNTIME=cloudflare`                                             |
| Cart/invoice UI                                                        | Browser localStorage/sessionStorage for the shopping experience; never authoritative payment/coupon/order storage                                    |
| Catalog filesystem                                                     | `collection/` is read and `public/catalog/` plus bundled catalog JSON generated at build time only                                                   |
| Custom design                                                          | Existing Coming Soon page retained; the repository has no upload/editor endpoint or upload storage to migrate                                        |
| Image processing                                                       | No runtime filesystem writes; original images are assets; local build-time generation remains local                                                  |

The request-scoped connection change follows [OpenNext's database guidance](https://opennext.js.org/cloudflare/howtos/db). No database rewrite or D1 migration is needed. Keep the **same Supabase database, Auth project, admin UUIDs and COUPON_HMAC_SECRET** when moving hosting; existing orders and coupon verifiers remain valid. Do not regenerate issued codes or reinitialize the coupon batch on deploy.

For an existing store database: take a private backup using the database provider's export/`pg_dump`, verify `supabase/migrations/001_store.sql` has already been applied, then point the Worker secret at that same database's transaction pooler URI. This hosting change does not alter schema or copy/delete rows. Only if this is a **fresh empty database**, apply the existing migration from a trusted local terminal with `.env.local` set to that database:

```powershell
npm run db:migrate
# Fresh store only, after reviewing the private coupon batch and HMAC secret:
npm run coupons:init
```

For a database move, separately back up and restore the full schema, data and sequences using PostgreSQL tooling, keep the existing HMAC secret, migrate Auth users/membership through the provider, validate in staging, and only then switch the connection string. Do not point migration or fixture scripts at production during verification. Private operational scripts never run as part of any build/deploy command.

## Confirm and update the SAME Worker — future publishing only

**No login, secret upload, deployment or live-data change was performed during this task.** The reported current address is `https://quiet-disk-e80b.tarekradii64.workers.dev/`. It is not enough to prove the account/Worker identity: Wrangler is unauthenticated and no prior identity configuration exists in this repository.

When you choose to publish later:

1. Run `npx wrangler login`, then `npx wrangler whoami`. In Workers & Pages, open the existing application serving that address. Confirm its exact Worker name and account ID. Do not create another Worker or use a temporary preview account.
2. In `wrangler.jsonc`, replace `name` and `services[0].service` with that **confirmed existing name** and add `account_id` with the **confirmed 32-character ID**. No account ID has been guessed. Keep the self-reference identical to `name`.
3. Set both `vars.SITE_URL` and `vars.NEXT_PUBLIC_SITE_URL` to the current HTTPS site origin, without a trailing slash. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the same existing Auth project's public values. Configure the Supabase Site URL accordingly.
4. Confirm the existing deployment is found, and inspect secret **names only**:

   ```powershell
   npx wrangler deployments list
   npx wrangler secret list
   ```

5. Only when ready for production changes, set the two server secrets interactively on that confirmed Worker. Use the existing values; never paste them into a command argument or commit them:

   ```powershell
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put COUPON_HMAC_SECRET
   ```

   Keep `DATABASE_SSL=require` and `VERA_RUNTIME=cloudflare`. Secret uploads are remote changes; they are not part of local preparation. If the secrets are already correct, preserve them.

6. Run the local checks and staging owner/order smoke test. Then, when you intend to publish:

   ```powershell
   npm run deploy:cloudflare
   ```

   This script refuses placeholders, missing account/public Auth settings, a Worker with no existing deployment, and missing required secret names. It checks the existing account deployment, regenerates the catalog, builds fresh, dry-runs, then deploys via OpenNext. It never invokes Pages/static upload, `out/`, account creation or resource provisioning. It cannot verify the correctness of secret values or owner membership; staging testing is still required.

7. Open the same original URL and verify home, image loading, filters, cart, safe quote, checkout, real owner login, confirmation and cancellation. Check Worker metrics for errors/CPU limits. Future changes use the **same config and `npm run deploy:cloudflare`**. Add/update photos in `collection/`, update metadata, run `npm run catalog`, and commit source/config/registry changes. Never drag `out/` into an upload screen, and never deploy raw `.next/`.

## Free-tier limits and operational boundaries

No billing upgrade or resource provisioning is required by this configuration. Stay on **Workers Free** and the existing Supabase Free project if using that tier. These are limited services, not a promise of unlimited production capacity.

- Cloudflare currently lists **100,000 Worker requests/day**, **10 ms CPU per HTTP request**, **128 MB memory**, 50 subrequests and six simultaneous outgoing connections per request. Waiting for network I/O does not consume CPU. Local preview verifies compatibility but **does not establish that real traffic stays under the production CPU allowance**. Next.js SSR/Auth may exceed it; check production metrics before relying on Free for traffic. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
- Assets are free to store and asset-only requests are free/unlimited; requests invoking the Worker still count. Free allows **20,000 asset files**, **25 MiB per asset**. OpenNext's cached page delivery can still invoke the Worker. [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).
- Cloudflare's current limits page states **64 MiB uncompressed Worker size** and no compressed-size limit. OpenNext's overview still cites the older 3 MiB gzip Free limit. This build fits both: approximately **6.78 MiB uncompressed / 1.46 MiB gzip**, with 92 assets. Recheck official limits when deploying; size is not the CPU/startup-time limit.
- Supabase Free currently includes **500 MB database**, **5 GB egress**, **50,000 monthly active Auth users**, and up to two active projects; inactive projects can pause after one week. Automatic backups/PITR are not included. Store rows and durable rate-limit keys consume database space; monitor usage and keep private backups. [Supabase pricing](https://supabase.com/pricing).

If usage exceeds a free allowance, reduce workload/traffic or address the specific limit. Do not silently enable paid services. Public availability, Supabase TLS/pooler reachability and production CPU behavior remain account/network checks for the eventual staging/live deployment.

## Repeat verification with isolated data

Prepare a disposable local PostgreSQL database called `vera_test`. The test setup **wipes its fixture tables**; never use a real store database. With a local instance at the example port:

```powershell
$env:TEST_DATABASE_URL = 'postgres://vera_test@127.0.0.1:55439/vera_test'
npm test
npm run build:cloudflare
npm run test:e2e:cloudflare
npm run check:cloudflare
node scripts/audit-private-assets.mjs
```

The last audit requires the locally generated private 30-code CSV, never prints its codes, and scans both client assets and the Worker build. Workers E2E uses an ignored separate config on port 8788, disables remote bindings, uses only the local `vera_test` database and fixture coupons, and does not read production `.dev.vars`. Tests use installed Microsoft Edge on Windows; for another environment configure Playwright's Chromium channel as described in the README.

See [the verification report](CLOUDFLARE-VERIFICATION.md) for actual results and untested external prerequisites.
