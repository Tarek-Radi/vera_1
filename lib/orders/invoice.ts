import { brand } from "../../config/brand";
import { money } from "../catalog";
import type { PricedLine } from "./validation";
export type OrderInvoice = {
  orderNumber: string;
  status: string;
  items: PricedLine[];
  subtotal: number;
  discountTotal: number;
  totalBeforeShipping: number;
  expiresAt: string;
};
export function invoiceText(order: OrderInvoice) {
  return [
    "VERA | NEW ORDER",
    `Order Number: ${order.orderNumber}`,
    "",
    "ORDER DETAILS",
    ...order.items.flatMap((item, i) => [
      "",
      `ITEM ${i + 1}`,
      `Product: ${item.name}`,
      `Code: ${item.sku}`,
      `Color: ${item.color}`,
      `Size: ${item.size}`,
      `Quantity: ${item.quantity}`,
      `Unit Price: ${money(item.unitPrice)}`,
      `Subtotal: ${money(item.subtotal)}`,
      ...(item.discountPercent
        ? [
            `Coupon: ${item.couponLabel || "Applied"}`,
            `Coupon Discount: ${item.discountPercent}%`,
            `Discount Value: -${money(item.discountAmount)}`,
          ]
        : []),
      `Item Total: ${money(item.lineTotal)}`,
    ]),
    "",
    "ORDER SUMMARY",
    `Subtotal: ${money(order.subtotal)}`,
    `Total Coupon Discount: -${money(order.discountTotal)}`,
    `TOTAL BEFORE SHIPPING: ${money(order.totalBeforeShipping)}`,
    "",
    "PAYMENT & DELIVERY",
    "Payment Method: To be confirmed with VERA via WhatsApp.",
    "Possible arrangements: Cash on Delivery, InstaPay, Vodafone Cash or another agreed method.",
    "Delivery Address: To be confirmed via WhatsApp.",
    "Delivery Fees: To be confirmed by VERA.",
    "",
    "Hello VERA! I would like to confirm this order. Please contact me to arrange delivery and payment. Thank you!",
  ].join("\n");
}
export const invoiceUrl = (order: OrderInvoice) =>
  `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(invoiceText(order))}`;
