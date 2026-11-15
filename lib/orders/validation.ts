import { z } from "zod";
import { productBySku, type Product } from "../catalog";
export class StoreError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "INVALID_REQUEST",
  ) {
    super(message);
  }
}
export const lineSchema = z
  .object({
    sku: z.string().min(4).max(64),
    size: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(20),
    coupon: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{8,64}$/)
      .optional(),
  })
  .strict();
export const cartSchema = z
  .object({ items: z.array(lineSchema).min(1).max(20) })
  .strict();
const plainText = (label: string, min: number, max: number) => z.string()
  .trim().min(min, `${label} is required.`).max(max, `${label} is too long.`)
  .refine((value) => !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value), `${label} contains unsupported control characters.`);
export const customerSchema = z.object({
  name: plainText("Customer name", 2, 100),
  phone: plainText("Mobile number", 8, 24)
    .transform((value) => value.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) % 16)).replace(/[\s().-]/g, ""))
    .refine((value) => /^(?:01[0125]\d{8}|\+?[1-9]\d{7,14})$/.test(value), "Enter a valid mobile number (Egyptian mobile or international format)."),
  governorate: plainText("Governorate", 2, 80),
  area: plainText("City / area", 2, 100),
  address: plainText("Full shipping address", 8, 350),
  paymentPreference: plainText("Payment preference", 0, 80).optional().default(""),
  notes: plainText("Order notes", 0, 600).optional().default(""),
}).strict();
export type CheckoutCustomer = z.infer<typeof customerSchema>;
export const checkoutSchema = cartSchema
  .extend({ idempotencyKey: z.string().uuid(), customer: customerSchema })
  .strict();
export type CartLine = z.infer<typeof lineSchema>;
export type PricedLine = CartLine & {
  name: string;
  color: string;
  unitPrice: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  couponLabel?: string;
};
export function validateLines(
  items: CartLine[],
  find: (sku: string) => Product | undefined = productBySku,
): PricedLine[] {
  const codes = new Set<string>(),
    keys = new Set<string>();
  let orderSubtotal = 0;
  return items.map((item) => {
    const p = find(item.sku);
    if (!p || !p.available)
      throw new StoreError(
        "An item is no longer available. Please update your bag.",
      );
    if (!p.sizes.includes(item.size))
      throw new StoreError(`Please select an available size for ${p.name}.`);
    const key = `${item.sku}:${item.size}`;
    if (keys.has(key))
      throw new StoreError(
        "Please combine duplicate product and size entries.",
      );
    keys.add(key);
    if (item.coupon && codes.has(item.coupon))
      throw new StoreError("Each coupon can apply to only one bag item.");
    if (item.coupon) codes.add(item.coupon);
    const subtotal = p.priceMinor * item.quantity;
    orderSubtotal += subtotal;
    if (!Number.isSafeInteger(orderSubtotal) || orderSubtotal > 2_000_000_000)
      throw new StoreError(
        "This order is too large. Please contact VERA directly.",
      );
    return {
      ...item,
      name: p.name,
      color: p.color,
      unitPrice: p.priceMinor,
      subtotal,
      discountPercent: 0,
      discountAmount: 0,
      lineTotal: subtotal,
    };
  });
}
export function applyDiscount(line: PricedLine, percent: number): PricedLine {
  if (![15, 20, 30].includes(percent))
    throw new StoreError("This coupon is not available.");
  const discountAmount = Math.floor((line.subtotal * percent + 50) / 100);
  return {
    ...line,
    discountPercent: percent,
    discountAmount,
    lineTotal: line.subtotal - discountAmount,
    couponLabel: line.coupon ? `••••${line.coupon.slice(-4)}` : undefined,
  };
}
export const totals = (items: PricedLine[]) => ({
  subtotal: items.reduce((n, x) => n + x.subtotal, 0),
  discountTotal: items.reduce((n, x) => n + x.discountAmount, 0),
  totalBeforeShipping: items.reduce((n, x) => n + x.lineTotal, 0),
});
