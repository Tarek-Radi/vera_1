import postgres from "postgres";
import { applyMigrations } from "../../scripts/apply-migrations.mjs";
import { createHmac } from "node:crypto";
export default async function setup() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value)
    throw new Error("Set TEST_DATABASE_URL before running E2E tests.");
  const url = new URL(value);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.pathname !== "/vera_test"
  )
    throw new Error("E2E fixtures only use a local database named vera_test.");
  const sql = postgres(value, { onnotice: () => {} });
  try {
    await applyMigrations(sql);
    await sql`truncate coupon_reservations, order_events, order_items, orders, coupons, rate_limits restart identity cascade`;
    for (const [code, percent] of [
      ["VALID15CODE", 15],
      ["VALID20CODE", 20],
      ["VALID30CODE", 30],
    ] as const) {
      const hash = createHmac(
        "sha256",
        "only-for-automated-tests-never-use-in-production",
      )
        .update(code)
        .digest("hex");
      await sql`insert into coupons (code_verifier, discount_percent) values (${hash}, ${percent})`;
    }
  } finally {
    await sql.end();
  }
}
