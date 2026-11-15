import { testCustomer } from "../fixtures";
import { expect, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import postgres from "postgres";
import { products } from "../../lib/catalog";

test("Workers requests persist separate orders and reject forged prices/admin access", async ({
  request,
}) => {
  test.skip(
    test.info().project.name !== "desktop",
    "API persistence is independent of viewport.",
  );
  const url = new URL(process.env.TEST_DATABASE_URL!);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/vera_test"
  )
    throw new Error("Only local fixture data can be inspected.");
  const sql = postgres(url.toString());
  const hoodie = products.find((p) => p.identity === "black_hoodie")!;
  const items = [{ sku: hoodie.sku, size: "L", quantity: 1 }];
  try {
    const quote = await request.post("/api/quote", { data: { items } });
    expect(quote.status()).toBe(200);
    expect((await quote.json()).totalBeforeShipping).toBe(60000);
    const key = randomUUID();
    const first = await request.post("/api/checkout", {
      data: { customer: testCustomer, items, idempotencyKey: key },
    });
    expect(first.status()).toBe(200);
    const order = await first.json();
    // A second HTTP request must reconnect to Postgres and find the durable order.
    const retry = await request.post("/api/checkout", {
      data: { customer: testCustomer, items, idempotencyKey: key },
    });
    expect(retry.status()).toBe(200);
    expect((await retry.json()).orderNumber).toBe(order.orderNumber);
    const keyHash = createHash("sha256").update(key).digest("hex");
    const rows =
      await sql`select id, subtotal, total_before_shipping from orders where idempotency_key = ${keyHash}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].total_before_shipping).toBe(60000);
    const second = await request.post("/api/checkout", {
      data: { customer: testCustomer, items, idempotencyKey: randomUUID() },
    });
    expect(second.status()).toBe(200);
    expect((await second.json()).orderNumber).not.toBe(order.orderNumber);
    expect(
      (
        await request.post("/api/quote", {
          data: { items: [{ ...items[0], price: 1 }] },
        })
      ).status(),
    ).toBe(400);
    expect((await request.get("/api/admin/orders")).status()).toBe(503); // Auth intentionally absent in this isolated fixture.
    expect(
      (
        await request.post("/api/admin/orders", {
          data: { id: rows[0].id, action: "CONFIRMED" },
        })
      ).status(),
    ).toBe(503);
    expect(
      (
        await request.post("/api/admin/session", { data: { email: "invalid" } })
      ).status(),
    ).toBe(400);
    expect((await request.get("/.env.local")).status()).toBe(404);
    expect((await request.get("/private/coupons.csv")).status()).toBe(404);
    const image = await request.get(hoodie.images[0]);
    expect(image.status()).toBe(200);
    expect(image.headers()["x-content-type-options"]).toBe("nosniff");
  } finally {
    // This API scenario precedes the browser suites on the same localhost IP.
    // Reset only disposable fixture counters; keep production limits unchanged.
    await sql`delete from rate_limits`;
    await sql.end();
  }
});
