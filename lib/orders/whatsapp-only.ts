import {
  cartSchema,
  checkoutSchema,
  validateLines,
  totals,
  StoreError,
} from "./validation";
import { invoiceText } from "./invoice";
import { whatsappHandoff } from "../whatsapp";
import { brand } from "../../config/brand";
export function quoteWithoutDatabase(input: unknown) {
  const { items } = cartSchema.parse(input);
  if (items.some((item) => item.coupon))
    throw new StoreError(
      "Coupons are unavailable in WhatsApp-only checkout. Remove the coupon and retry.",
      400,
      "COUPONS_DISABLED",
    );
  const lines = validateLines(items);
  return { items: lines, ...totals(lines) };
}
export function checkoutWithoutDatabase(input: unknown) {
  const parsed = checkoutSchema.parse(input);
  const quote = quoteWithoutDatabase({ items: parsed.items });
  const order = {
    ...quote,
    customer: parsed.customer,
    status: "UNSAVED",
    orderNumber: "",
    expiresAt: "",
    shippingCharge: null,
  };
  const invoice =
    invoiceText(order) +
    "\nالطلب بيتابع على واتساب؛ الموقع مش بيحفظ سجل للطلب ومش بيقدر يتأكد من إرسال الرسالة.";
  return {
    ...quote,
    customer: parsed.customer,
    shippingCharge: null,
    saved: false,
    invoice,
    ...whatsappHandoff(brand.whatsapp, invoice),
  };
}
