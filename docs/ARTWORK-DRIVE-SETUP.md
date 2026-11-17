# VERA custom artwork — Vercel / Google Drive

## Current behavior

The existing custom request validates customer fields, variants and selected artwork. It disables edits, shows “Waiting… Uploading your artwork” and an actual image counter, and posts **one image at a time** to `/api/custom-artwork`. Each confirmed result is retained immediately. Failure stops the sequence; Retry skips confirmed images and reuses stable tokens for uncertain results. Only after every image is confirmed does the page prepare the complete message and navigate in the same tab to WhatsApp. Open WhatsApp and Copy message are rendered before navigation as fallbacks. Opening WhatsApp does not send or confirm an order; the customer presses Send. Drive links are not automatic attachments.

Turnstile has been removed from this custom flow, including its widget, token checks and production build requirement. No Turnstile keys, database, Supabase, migrations or paid APIs are needed. The regular shopping cart is unchanged. The authenticated Apps Script integration, bounded requests, same-origin checks, file validation and existing locked daily cap remain.

## Exact manual setup

1. Use Vercel’s **Next.js** framework preset, default output, and build command **`npm run build`**. Do not use OpenNext or Workers commands for this deployment.
2. In **Vercel Project → Settings → Environment Variables**, set these for Production (and separately Preview if used):
   - `ARTWORK_SCRIPT_URL`: authorized Google Apps Script deployment URL ending `/exec` — server-only.
   - `ARTWORK_SCRIPT_SECRET`: private random secret of at least 32 characters matching the Apps Script Property — server-only.
   - `SITE_URL`: exact browser origin, e.g. your actual HTTPS production domain. Preview must use its own matching origin.
   - `ARTWORK_MAX_BYTES`: `1048576` recommended (1 MiB per image); match the Apps Script property. Maximum 2 MiB.
   Redeploy after changing Vercel settings. Remove obsolete `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` if nothing else uses them.
3. For local development, use those names in ignored `.env.local`, set `SITE_URL=http://localhost:3000`, and run `npm run dev`. Restart after environment changes. Do not commit real credentials.
4. Google destination remains **`1IS01GtI2kiI5LFOVb1IaO_pAkfZFx1iT`**. Give the script’s authorized Google account Editor access. Review Manage access for this folder and its ancestors: General access must be Restricted; remove anyone/domain-wide access at its source. Review users/groups too. Explicitly invite the store owner as Viewer (or Editor if needed) if another account runs the script. Private links require that authorized account to sign in; nothing creates public permissions.
5. Create a standalone Apps Script project. Paste `apps-script/Artwork.gs` into Code.gs, enable **Services → Drive API v3**, and copy `apps-script/appsscript.json` into the manifest. If using a standard Google Cloud project, enable Drive API there as well. Use one script project for this destination.
6. Set Script Properties: `ARTWORK_SCRIPT_SECRET` (same private value), `ARTWORK_MAX_BYTES=1048576`, and `ARTWORK_DAILY_LIMIT=100`. Generate a secret privately using a password manager or cryptographic random generator. Run `setup` and authorize Drive access. It checks inherited permissions, indexes existing descendant filenames once and creates two private JSON index files, recording `INDEX_FILE_ID` and `INDEX_BACKUP_ID`. Do not delete/edit these files or IDs.
7. Deploy the script as **Web app**, execute as **Me**, access **Anyone** so the Vercel server can call it without Google cookies. The handler authenticates the shared secret before Drive operations; this does not share Drive files publicly. Copy `/exec` into Vercel. Publish a new script version after script changes. If Google account policy forbids this deployment, administrator approval is needed.
8. After configuration, test disposable artwork live: one image, multiple positions, an interrupted response and a retry. Confirm actual Drive IDs, filenames and private access; verify WhatsApp codes/links and folder reference. Do not infer delivery from opening the chat. Automated checks use mocked Google services and do not establish live authorization.

## Limits and retry integrity

At most seven selected positions; the browser retains the existing 2 MiB combined-artwork limit. Each request contains one file, with server byte limit default 1 MiB, hard maximum 2 MiB, and 40 megapixels. Base64 requests stay below Vercel’s 4.5 MB body limit. The route is standard Node.js, declares `maxDuration=60`, bounds Drive operations to 45 seconds per request, and the client times out after 65 seconds. Confirm Vercel allows the declared duration. The server verifies actual image format/container/dimensions and derives its extension. Browser previews also decode the file. Google storage and Apps Script quotas still apply.

Codes use server-side Web Crypto and the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. Randomness alone does not guarantee uniqueness. Apps Script holds LockService over index checks, targeted filename collision checks across descendants, reservations and file creation. Genuine collisions cause server regeneration (at most five attempts). Tokens bind request reference, position and SHA-256 bytes. Replacing artwork creates a new token; old revisions remain in Drive for owner review.

The private Drive index maps tokens to codes/reserved file IDs, folder IDs and hashes, and keeps the existing daily cap (default 100 new revisions per UTC day). Before creating a file, both index copies persist its reserved Drive ID. An uncertain retry reads or creates that same ID rather than duplicating artwork. The newest valid generation recovers interrupted mirror writes. No customer name, phone or address is sent to Drive by this API.

If both index copies are corrupt/unavailable, uploads fail closed. Stop uploads before administrator repairs; restore IDs or the newest valid copy/version history. Never start a fresh index alongside pending requests. Keep the same Apps Script project because file appProperties belong to its OAuth app. Capacity is capped at 10,000 tokens / 6 MB index JSON and requires a planned migration if reached; do not reset metadata to bypass it. Do not remove quotas or locking.

Files, customer inputs and successful results remain in the open page after errors. Refreshing or leaving the editor loses that local draft; successful files remain in Drive. Same-tab WhatsApp navigation happens only on completion. Local ZIP/individual downloads and native sharing remain optional backups, never required manual attachments after successful uploads.

Checks: `npm test`, `npm run test:e2e:custom`, `npm run typecheck`, `npm run lint`, `npm run build`. No deployment is performed by these commands.

## Upload diagnostics
The setup JSON index files are metadata only, not proof of uploaded artwork. On failure the updated script logs only a correlation ID, operation stage and categorized error under **Apps Script → Executions → doPost → Logs**. The website displays the same reference. No raw exceptions, secrets, image payloads or customer details are logged. Update Code.gs from `apps-script/Artwork.gs`, then Deploy → Manage deployments → Edit → New version → Deploy, retaining the existing /exec URL. Local source changes do not update the deployed script automatically.
