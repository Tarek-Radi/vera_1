import { z } from "zod";
import { products } from "../catalog";
import { customerSchema } from "../orders/customer";
import {
  customColors,
  customPriceLabel,
  printPositions,
} from "../../config/custom-design";
import { whatsappHandoff } from "../whatsapp";
export const hoodieOptions = customColors.map((color) => ({
  color,
  sizes: [
    ...new Set(
      products
        .filter(
          (p) =>
            p.category === "hoodies" &&
            p.available &&
            p.color.toLowerCase() === color.toLowerCase(),
        )
        .flatMap((p) => p.sizes),
    ),
  ],
}));
export const variantSchema = z
  .object({
    color: z.enum(customColors),
    size: z.string(),
    quantity: z.number().int().min(1).max(999),
  })
  .refine(
    (v) =>
      hoodieOptions.some(
        (o) => o.color === v.color && o.sizes.includes(v.size),
      ),
    "Choose an available hoodie color and size.",
  );
const safeText = z
  .string()
  .max(200)
  .refine(
    (v) => !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(v),
    "Remove unsupported characters from artwork names or notes.",
  );
export const customRequestSchema = z.object({
  reference: z.string().regex(/^VERA-CUSTOM-[a-f0-9-]{36}$/),
  variants: z.array(variantSchema).min(1).max(20),
  artwork: z
    .array(
      z.object({
        position: z.number().int().min(1).max(7),
        filename: safeText.min(1),
        extension: z.enum(["png", "jpg", "webp"]),
        note: safeText,
      }),
    )
    .min(1, "Select at least one position and upload artwork.")
    .max(7)
    .refine((a) => new Set(a.map((x) => x.position)).size === a.length),
  customer: customerSchema,
});
export type CustomRequest = z.infer<typeof customRequestSchema>;
export type HoodieVariant = z.infer<typeof variantSchema>;
export function customMessage(input: unknown) {
  const r = customRequestSchema.parse(input),
    c = r.customer;
  return [
    "VERA — Custom Hoodie Request",
    `Request reference: ${r.reference}`,
    "Browser-generated request reference only; not a saved or confirmed order.",
    "",
    `Customer: ${c.name}`,
    `Phone: ${c.phone}`,
    `Governorate: ${c.governorate}`,
    `City / area: ${c.area}`,
    `Address: ${c.address}`,
    ...(c.paymentPreference
      ? [`Payment preference: ${c.paymentPreference}`]
      : []),
    "",
    ...r.variants.map(
      (v) => `Hoodie — ${v.color} / ${v.size} / Quantity: ${v.quantity}`,
    ),
    `Total quantity: ${r.variants.reduce((n, v) => n + v.quantity, 0)}`,
    "",
    ...r.artwork.map(
      (a) =>
        `Position ${a.position} — ${printPositions.find((p) => p.id === a.position)!.label}: ${a.filename} → ${a.position}.${a.extension}${a.note ? ` | Placement note: ${a.note}` : ""}`,
    ),
    "",
    customPriceLabel,
    "Shipping: to be confirmed on WhatsApp.",
    ...(c.notes ? [`Order notes: ${c.notes}`] : []),
    "Artwork files will be attached separately.",
    "Please confirm availability, printing price and shipping. This request is not payment or order confirmation.",
  ].join("\n");
}
export function customHandoff(number: string, message: string) {
  try {
    return whatsappHandoff(number, message);
  } catch {
    throw new Error(
      "Store WhatsApp is unavailable. Set storeWhatsApp in config/brand.ts to the store's international number and configure it locally / on Vercel.",
    );
  }
}
