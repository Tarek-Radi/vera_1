import { describe, it, expect } from "vitest";
import {
  cartSchema,
  validateLines,
  applyDiscount,
  totals,
} from "../lib/orders/validation";
import { products } from "../lib/catalog";
import { invoiceText, invoiceUrl } from "../lib/orders/invoice";
import { generateCoupons } from "../scripts/generate-coupons.mjs";
const hoodie = products.find((p) => p.identity === "black_hoodie")!;
const hijab = products.find((p) => p.identity === "white_hijab")!;
describe("authoritative pricing and invoices", () => {
  it("uses 600 selling price for 15% = 510 even with 650 compare-at", () => {
    const [line] = validateLines(
      [{ sku: hoodie.sku, size: "XL", quantity: 1 }],
      () => ({ ...hoodie, compareAtMinor: 65000 }),
    );
    expect(applyDiscount(line, 15)).toMatchObject({
      unitPrice: 60000,
      discountAmount: 9000,
      lineTotal: 51000,
    });
  });
  it("rejects client price injection, bad quantities, unknown sizes and unavailable products", () => {
    expect(
      cartSchema.safeParse({
        items: [{ sku: hoodie.sku, size: "XL", quantity: 1, price: 1 }],
      }).success,
    ).toBe(false);
    expect(
      cartSchema.safeParse({
        items: [{ sku: hoodie.sku, size: "XL", quantity: -2 }],
      }).success,
    ).toBe(false);
    expect(() =>
      validateLines([{ sku: hoodie.sku, size: "NO", quantity: 1 }]),
    ).toThrow();
    expect(() =>
      validateLines([{ sku: hoodie.sku, size: "XL", quantity: 1 }], () => ({
        ...hoodie,
        available: false,
      })),
    ).toThrow();
  });
  it("prevents one code across multiple lines and duplicate product-size entries", () => {
    expect(() =>
      validateLines([
        { sku: hoodie.sku, size: "XL", quantity: 1, coupon: "TESTCODE" },
        { sku: hijab.sku, size: "One Size", quantity: 1, coupon: "TESTCODE" },
      ]),
    ).toThrow("only one");
    expect(() =>
      validateLines([
        { sku: hoodie.sku, size: "XL", quantity: 1 },
        { sku: hoodie.sku, size: "XL", quantity: 2 },
      ]),
    ).toThrow("combine");
  });
  it("produces the requested 1270 EGP invoice without charging shipping", () => {
    const [h, scarf] = validateLines([
      { sku: hoodie.sku, size: "XL", quantity: 2, coupon: "EXAMPLECODE" },
      { sku: hijab.sku, size: "One Size", quantity: 1 },
    ]);
    const items = [applyDiscount(h, 15), scarf];
    const order = {
      orderNumber: "VERA-00000123",
      status: "PENDING",
      expiresAt: "",
      items,
      ...totals(items),
    };
    expect(order).toMatchObject({
      subtotal: 145000,
      discountTotal: 18000,
      totalBeforeShipping: 127000,
    });
    const text = invoiceText(order);
    expect(text).toContain(hoodie.sku);
    expect(text).toContain("Size: XL");
    expect(text).toContain("Quantity: 2");
    expect(text).toContain("1,270 EGP");
    expect(text).toContain("Delivery Fees: To be confirmed by VERA.");
    const url = new URL(invoiceUrl(order));
    expect(url.pathname).toBe("/201009785343");
    expect(url.searchParams.get("text")).toBe(text);
  });
  it("generates exactly 30 random codes with the required distribution", () => {
    const batch = generateCoupons();
    expect(batch).toHaveLength(30);
    expect(new Set(batch.map((c) => c.code)).size).toBe(30);
    for (const percent of [15, 20, 30])
      expect(batch.filter((c) => c.discount_percent === percent)).toHaveLength(
        10,
      );
    expect(
      generateCoupons().some((x) => batch.some((y) => x.code === y.code)),
    ).toBe(false);
  });
});
