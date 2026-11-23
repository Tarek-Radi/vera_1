import { scarfWording } from "../product-wording.mjs";
import { brand } from "../../config/brand";
import { whatsappHandoff } from "../whatsapp";
import type { PricedLine } from "./validation";
import type { CheckoutCustomer } from "./customer";
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
  bundleDiscount?: number;
  bundleCount?: number;
};
const egp = (n: number) =>
  `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(n / 100)} ج.م`;
export function invoiceText(o: OrderInvoice) {
  const c = o.customer;
  return [
    "طلب جديد من VERA",
    ...(o.orderNumber ? [`رقم الطلب: ${o.orderNumber}`] : []),
    ...(o.status === "PENDING" ? ["حالة الطلب: في انتظار التأكيد"] : []),
    ...(c
      ? [
          "",
          "بيانات العميل:",
          `الاسم: ${c.name}`,
          `الموبايل: ${c.phone}`,
          `المحافظة: ${c.governorate}`,
          `المدينة / المنطقة: ${c.area}`,
          `العنوان بالتفصيل: ${c.address}`,
        ]
      : []),
    "",
    "تفاصيل الطلب:",
    ...o.items.flatMap((x, i) => [
      "",
      `${i + 1}. ${scarfWording(x.name)}`,
      `اللون: ${x.color}`,
      `المقاس: ${x.size}`,
      `الكمية: ${x.quantity}`,
      `سعر القطعة: ${egp(x.unitPrice)}`,
      ...(x.discountAmount > 0
        ? [
            `الكوبون المستخدم: ${x.coupon || x.couponLabel} (${x.discountPercent}%)`,
            `خصم المنتج: ${egp(x.discountAmount)}`,
          ]
        : []),
      `إجمالي المنتج: ${egp(x.lineTotal)}`,
    ]),
    "",
    "ملخص الحساب:",
    `قيمة المنتجات: ${egp(o.subtotal)}`,
    ...(o.bundleDiscount ? [`Hoodie + Pants Bundle Discount (${o.bundleCount}): -${egp(o.bundleDiscount)}`] : []),
    ...(o.discountTotal && !o.bundleDiscount ? [`إجمالي الخصم (عرض أو كوبون): ${egp(o.discountTotal)}`] : []),
    `الشحن: ${o.shippingCharge == null ? "يُحدد بعد التأكيد" : egp(o.shippingCharge)}`,
    o.shippingCharge == null
      ? `المبلغ المعروف قبل الشحن: ${egp(o.totalBeforeShipping)} — الشحن إضافي`
      : `الإجمالي شامل الشحن: ${egp(o.totalBeforeShipping + o.shippingCharge)}`,
    ...(c?.paymentPreference
      ? ["", `طريقة الدفع المطلوبة: ${c.paymentPreference}`]
      : []),
    ...(c?.notes ? ["", `ملاحظات: ${c.notes}`] : []),
    "",
    "برجاء تأكيد التوفر وتفاصيل الشحن والدفع.",
    "ده ملخص طلب، مش إثبات دفع أو فاتورة ضريبية.",
  ].join("\n");
}
export const invoiceUrl = (o: OrderInvoice) =>
  whatsappHandoff(brand.whatsapp, invoiceText(o)).whatsappUrl;
