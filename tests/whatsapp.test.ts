import { it, expect } from "vitest";
import { customerSchema } from "../lib/orders/customer";
import {
  checkoutSchema,
  validateLines,
  totals,
} from "../lib/orders/validation";
import { invoiceText } from "../lib/orders/invoice";
import {
  whatsappHandoff,
  whatsappUrl,
  normalizeWhatsAppNumber,
} from "../lib/whatsapp";
import { products } from "../lib/catalog";
import { testCustomer } from "./fixtures";
const items = validateLines([
  { sku: products[0].sku, size: products[0].sizes[0], quantity: 2 },
]);
const order = {
  orderNumber: "VERA-123",
  status: "PENDING",
  expiresAt: "",
  customer: testCustomer,
  items,
  ...totals(items),
};
it("normalizes destinations and rejects malformed numbers", () => {
  expect(normalizeWhatsAppNumber("+20 (100) 978-5343")).toBe("201009785343");
  for (const n of ["01009785343", "foo", "+20abc"])
    expect(() => normalizeWhatsAppNumber(n)).toThrow();
});
it("encodes the complete Arabic message and special characters", () => {
  const text = invoiceText({
    ...order,
    customer: { ...testCustomer, notes: "مقاس & لون + # 50%" },
  });
  expect(
    new URL(whatsappUrl("201009785343", text)).searchParams.get("text"),
  ).toBe(text);
  expect(text).toContain(testCustomer.address);
  expect(text).not.toContain(items[0].sku);
  expect(text).toContain("الشحن إضافي");
  expect(text).not.toContain("طريقة الدفع المطلوبة");
});
it("distinguishes unknown and known shipping", () => {
  expect(invoiceText({ ...order, shippingCharge: 0 })).toContain(
    "الإجمالي شامل الشحن",
  );
  expect(invoiceText(order)).toContain("يُحدد بعد التأكيد");
});
it("keeps every item when the message requires copying", () => {
  const text = invoiceText({
    ...order,
    items: Array.from({ length: 20 }, (_, i) => ({
      ...items[0],
      name: `منتج ${i} ` + "تفاصيل ".repeat(20),
    })),
  });
  expect(text).toContain("20. منتج 19");
  expect(whatsappHandoff("201009785343", text)).toEqual({
    whatsappUrl: "https://wa.me/201009785343",
    requiresCopy: true,
  });
});
it("requires customer fields and rejects unpriced custom printing", () => {
  expect(
    customerSchema.safeParse({ ...testCustomer, address: "" }).success,
  ).toBe(false);
  expect(
    customerSchema.safeParse({ ...testCustomer, phone: "bad" }).success,
  ).toBe(false);
  const payload = {
    items: [{ sku: products[0].sku, size: products[0].sizes[0], quantity: 1 }],
    idempotencyKey: "0a127446-715a-4d38-a812-625cbb3d5800",
    customer: testCustomer,
  };
  expect(
    checkoutSchema.safeParse({ ...payload, customer: undefined }).success,
  ).toBe(false);
  expect(
    checkoutSchema.safeParse({ ...payload, shippingCharge: 1 }).success,
  ).toBe(false);
  expect(
    checkoutSchema.safeParse({
      ...payload,
      items: [
        {
          ...payload.items[0],
          customization: { placement: "front", printSize: "A4", charge: 1 },
        },
      ],
    }).success,
  ).toBe(false);
});
