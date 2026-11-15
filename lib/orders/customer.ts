import { z } from "zod";
const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} is too long.`)
    .refine(
      (v) => !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(v),
      `${label} contains unsupported characters.`,
    );
export const customerSchema = z
  .object({
    name: text("Customer name", 2, 100),
    phone: text("Mobile number", 8, 24)
      .transform((v) =>
        v
          .replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) % 16))
          .replace(/[\s().-]/g, ""),
      )
      .refine(
        (v) => /^(?:01[0125]\d{8}|\+?[1-9]\d{7,14})$/.test(v),
        "Enter a valid Egyptian mobile or international phone number.",
      ),
    governorate: text("Governorate", 2, 80),
    area: text("City / area", 2, 100),
    address: text("Full shipping address", 8, 350),
    paymentPreference: text("Payment preference", 0, 80).optional().default(""),
    notes: text("Notes", 0, 600).optional().default(""),
  })
  .strict();
export type CheckoutCustomer = z.infer<typeof customerSchema>;
