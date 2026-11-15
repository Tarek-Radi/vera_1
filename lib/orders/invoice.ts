import { brand } from "../../config/brand";
import { whatsappHandoff } from "../whatsapp";
import type { CheckoutCustomer, PricedLine } from "./validation";
export type OrderInvoice = {
  orderNumber: string;
  status: string;
  customer?: CheckoutCustomer | null;
  items: PricedLine[];
  subtotal: number;
  discountTotal: number;
  totalBeforeShipping: number;
  shippingCharge?: number | null;
  expiresAt: string;
};
const egp = (minor: number) => `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(minor / 100)} ج.م`;
const colors: Record<string, string> = { Black: "أسود", White: "أبيض", Burgundy: "نبيتي", Gray: "رمادي", Navy: "كحلي", Blue: "أزرق" };
// Input is persisted, server-priced order data; never browser-supplied totals.
export function invoiceText(order: OrderInvoice) {
  const customer = order.customer;
  const shippingKnown = order.shippingCharge != null;
  return [
    "طلب جديد من VERA",
    ...(order.orderNumber ? [`رقم الطلب: ${order.orderNumber}`] : []),
    ...(order.status === "PENDING" ? ["حالة الطلب: في انتظار التأكيد"] : []),
    ...(customer ? [
      "", "بيانات العميل:",
      `الاسم: ${customer.name}`,
      `الموبايل: ${customer.phone}`,
      `المحافظة: ${customer.governorate}`,
      `المدينة / المنطقة: ${customer.area}`,
      `العنوان بالتفصيل: ${customer.address}`,
    ] : []),
    "", "تفاصيل الطلب:",
    ...order.items.flatMap((item, i) => [
      "",
      `${i + 1}. ${item.name}`,
      `اللون: ${colors[item.color] || item.color}`,
      `المقاس: ${item.size === "One Size" ? "مقاس موحد" : item.size}`,
      `الكمية: ${item.quantity}`,
      `سعر القطعة: ${egp(item.unitPrice)}`,
      ...(item.discountAmount > 0
        ? [
            `قبل الخصم: ${egp(item.subtotal)}`,
            `الكوبون المستخدم: ${item.coupon || item.couponLabel || "خصم مطبّق"} (${item.discountPercent}%)`,
            `خصم المنتج: ${egp(item.discountAmount)}`,
          ]
        : []),
      `إجمالي المنتج: ${egp(item.lineTotal)}`,
    ]),
    "",
    "ملخص الحساب:",
    `قيمة المنتجات: ${egp(order.subtotal)}`,
    ...(order.discountTotal > 0 ? [`إجمالي الخصم: ${egp(order.discountTotal)}`] : []),
    `الشحن: ${shippingKnown ? egp(order.shippingCharge!) : "يُحدد بعد التأكيد"}`,
    shippingKnown
      ? `الإجمالي شامل الشحن: ${egp(order.totalBeforeShipping + order.shippingCharge!)}`
      : `المبلغ المعروف قبل الشحن: ${egp(order.totalBeforeShipping)} — الشحن إضافي`,
    ...(customer?.paymentPreference ? ["", `طريقة الدفع المطلوبة: ${customer.paymentPreference}`] : []),
    ...(customer?.notes ? ["", `ملاحظات: ${customer.notes}`] : []),
    "", "برجاء تأكيد التوفر وتفاصيل الشحن والدفع.",
    "ده ملخص طلب، مش إثبات دفع أو فاتورة ضريبية.",
  ].join("\n");
}
export const invoiceUrl = (order: OrderInvoice) =>
  whatsappHandoff(brand.whatsapp, invoiceText(order)).whatsappUrl;
