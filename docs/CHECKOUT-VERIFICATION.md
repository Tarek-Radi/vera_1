# WhatsApp checkout verification — 2026-11-16

Implemented server-validated customer/delivery details, persisted in the existing PostgreSQL order record. The final purchase button navigates the same tab to the owner's prefilled Arabic WhatsApp message after creating/reusing the pending order. Sending remains a customer action. Prices, coupons, quantities, sizes and totals use existing server validation; no payment or confirmation status is inferred from navigation.

Configure the single destination in `config/brand.ts`, variable `storeWhatsApp`, currently `201009785343`.

Before production use, apply `supabase/migrations/002_checkout_customer.sql` to the existing database (or use `npm run db:migrate` from a trusted, correctly configured terminal). This adds a nullable JSONB customer column and preserves existing records. Only isolated local test data was migrated during implementation. Existing Supabase/PostgreSQL credentials remain required for checkout/admin.

Verified:
- 31 unit/database tests, including concurrent retries, stored customer details, changed-payload rejection, Arabic/special-character encoding, coupons, multiple products, known/unknown shipping and long-message fallback.
- 8 Workers browser/API tests passed; 2 intentionally duplicated viewport-independent checks skipped.
- Desktop/mobile checkout navigation and return/reload retested successfully after the restored-discount display fix.
- Normal Next production build, OpenNext build, Wrangler dry run, TypeScript and ESLint passed.
- WhatsApp requests were intercepted by browser tests. No real messages sent and no site published.

The full cart/message remains available when a URL exceeds the conservative 8,000-character threshold; customers copy and paste it into the owner chat. Cart/form recovery and explicit open/copy actions remain available after returning. A tab-session copy of customer details and the prepared summary is documented in the privacy text.

Custom design is still the existing Coming Soon page. There is no priced printing/editor/upload feature or secure uploaded-design reference in this repository. Tests verify that unsupported custom printing and client-supplied charges are rejected. No print fees or design URLs were invented. Real authenticated Supabase owner operations remain dependent on account setup; no live authentication test was performed.
