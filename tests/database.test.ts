import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { applyMigrations } from "../scripts/apply-migrations.mjs";
import { testCustomer } from "./fixtures";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { products } from "../lib/catalog";
const testUrl = process.env.TEST_DATABASE_URL;
const suite = testUrl ? describe : describe.skip;
suite("real PostgreSQL order and coupon lifecycle", () => {
  let sql: ReturnType<typeof postgres>;
  let service: typeof import("../lib/orders/service");
  let verifier: typeof import("../lib/coupons/crypto").couponVerifier;
  const h = products.find((p) => p.identity === "black_hoodie")!,
    scarf = products.find((p) => p.identity === "white_hijab")!;
  const checkout = (items: Parameters<typeof service.checkout>[0], key: string) => service.checkout(items, key, testCustomer);
  const line = (coupon?: string) => ({
    sku: h.sku,
    size: "XL",
    quantity: 1,
    ...(coupon ? { coupon } : {}),
  });
  beforeAll(async () => {
    if (!new URL(testUrl!).pathname.endsWith("/vera_test"))
      throw new Error("Tests require a dedicated database named vera_test.");
    process.env.DATABASE_URL = testUrl;
    process.env.DATABASE_SSL = "disable";
    process.env.COUPON_HMAC_SECRET =
      "only-for-automated-tests-never-use-in-production";
    sql = postgres(testUrl!, { max: 8 });
    await applyMigrations(sql);
    service = await import("../lib/orders/service");
    verifier = (await import("../lib/coupons/crypto")).couponVerifier;
  });
  beforeEach(async () => {
    await sql`truncate coupon_reservations, order_events, order_items, orders, coupons, rate_limits restart identity cascade`;
    for (const [code, percent] of [
      ["VALID15CODE", 15],
      ["VALID20CODE", 20],
      ["VALID30CODE", 30],
    ] as const)
      await sql`insert into coupons (code_verifier, discount_percent) values (${verifier(code)}, ${percent})`;
  });
  afterAll(async () => {
    await sql?.end();
    const { db } = await import("../lib/db/client");
    await db().end();
  });
  it("validates real coupons, rejects invalid and keeps plaintext out of stored records", async () => {
    expect(await service.quote([line("VALID15CODE")])).toMatchObject({
      discountTotal: 9000,
      totalBeforeShipping: 51000,
    });
    await expect(service.quote([line("INVALIDCODE")])).rejects.toThrow(
      "invalid",
    );
    const order = await checkout([line("VALID15CODE")], randomUUID());
    expect(order.totalBeforeShipping).toBe(51000);
    const rows =
      await sql`select to_jsonb(o) as value from orders o union all select to_jsonb(i) from order_items i union all select to_jsonb(c) from coupons c`;
    expect(JSON.stringify(rows)).not.toContain("VALID15CODE");
  });
  it("allows only one of eight simultaneous customers to reserve the same code", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        checkout([line("VALID15CODE")], randomUUID()),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [{ count }] = await sql`select count(*)::int as count from orders`;
    expect(count).toBe(1);
  });
  it("returns one order for concurrent idempotent retries and rejects changed payloads", async () => {
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        checkout([line("VALID15CODE")], key),
      ),
    );
    expect(new Set(results.map((o) => o.orderNumber)).size).toBe(1);
    await expect(
      checkout([{ ...line(), quantity: 2 }], key),
    ).rejects.toThrow("delivery details changed");
  });
  it("supports independent coupons on different lines", async () => {
    const o = await checkout(
      [
        line("VALID15CODE"),
        {
          sku: scarf.sku,
          size: "One Size",
          quantity: 1,
          coupon: "VALID20CODE",
        },
      ],
      randomUUID(),
    );
    expect(o.totalBeforeShipping).toBe(71000);
    expect(o.discountTotal).toBe(14000);
  });
  it("releases cancelled reservations and never releases redeemed coupons", async () => {
    await checkout([line("VALID15CODE")], randomUUID());
    let [o] = await sql`select id from orders`;
    await service.changeOrder(o.id, "CANCELLED", randomUUID());
    expect(
      (
        await sql`select status from coupons where code_verifier = ${verifier("VALID15CODE")}`
      )[0].status,
    ).toBe("AVAILABLE");
    const newOrder = await checkout(
      [line("VALID15CODE")],
      randomUUID(),
    );
    [o] =
      await sql`select id from orders where order_number = ${newOrder.orderNumber}`;
    await service.changeOrder(o.id, "CONFIRMED", randomUUID());
    await service.changeOrder(o.id, "CANCELLED", randomUUID());
    expect(
      (
        await sql`select status from coupons where code_verifier = ${verifier("VALID15CODE")}`
      )[0].status,
    ).toBe("REDEEMED");
    await expect(
      checkout([line("VALID15CODE")], randomUUID()),
    ).rejects.toThrow("already used");
  });
  it("expires abandoned reservations and blocks late confirmation", async () => {
    await checkout([line("VALID15CODE")], randomUUID());
    const [o] = await sql`select id from orders`;
    await sql`update orders set expires_at = now() - interval '1 minute' where id = ${o.id}`;
    const second = await checkout([line("VALID15CODE")], randomUUID());
    expect(second.status).toBe("PENDING");
    expect(
      (await sql`select status from orders where id = ${o.id}`)[0].status,
    ).toBe("EXPIRED");
    await expect(
      service.changeOrder(o.id, "CONFIRMED", randomUUID()),
    ).rejects.toThrow("status change");
  });
  it("fulfils confirmed orders, logs history and leaves payment/shipping unconfirmed", async () => {
    const request = await checkout([line()], randomUUID());
    const [o] =
      await sql`select id from orders where order_number = ${request.orderNumber}`;
    await service.changeOrder(o.id, "CONFIRMED", randomUUID());
    await service.changeOrder(o.id, "FULFILLED", randomUUID());
    const [row] = await sql`select * from orders where id = ${o.id}`;
    expect(row).toMatchObject({
      status: "FULFILLED",
      payment_status: "UNCONFIRMED",
      shipping_status: "UNCONFIRMED",
    });
    expect(
      await sql`select * from order_events where order_id = ${o.id}`,
    ).toHaveLength(3);
  });
});
