import "server-only";
import { createHash } from "node:crypto";
import type { TransactionSql } from "postgres";
import { db } from "../db/client";
import { couponVerifier } from "../coupons/crypto";
import { brand } from "../../config/brand";
import {
  validateLines,
  applyDiscount,
  totals,
  StoreError,
  type CartLine,
  type PricedLine,
  type CheckoutCustomer,
  customerSchema,
} from "./validation";
import { invoiceText, type OrderInvoice } from "./invoice";
import { whatsappHandoff, normalizeWhatsAppNumber } from "../whatsapp";

// This small store serializes reservation lifecycle mutations in PostgreSQL, across all server instances.
// All checkout, expiry and admin paths acquire this lock first; no reverse lock ordering.
async function lock(tx: TransactionSql) {
  await tx`select pg_advisory_xact_lock(86421007)`;
}
export async function expireReservations(tx: TransactionSql) {
  await tx`update orders set status = 'EXPIRED' where status = 'PENDING' and expires_at <= now()`;
  await tx`update coupon_reservations r set status = 'EXPIRED' from orders o where r.order_id = o.id and o.status = 'EXPIRED' and r.status = 'RESERVED'`;
  await tx`update coupons c set status = 'AVAILABLE' where c.status = 'RESERVED' and not exists (select 1 from coupon_reservations r where r.coupon_id = c.id and r.status = 'RESERVED')`;
}
async function priceLines(items: CartLine[], tx: TransactionSql) {
  const priced = validateLines(items);
  const couponIds = new Map<string, string>();
  const result: PricedLine[] = [];
  for (const line of priced) {
    if (!line.coupon) {
      result.push(line);
      continue;
    }
    const [coupon] =
      await tx`select id, discount_percent, status from coupons where code_verifier = ${couponVerifier(line.coupon)} for update`;
    if (!coupon || coupon.status !== "AVAILABLE")
      throw new StoreError(
        "This coupon is invalid, already used, or reserved for another order.",
        409,
        "COUPON_UNAVAILABLE",
      );
    couponIds.set(line.coupon, coupon.id);
    result.push(applyDiscount(line, coupon.discount_percent));
  }
  return { items: result, couponIds };
}
const clean = (line: PricedLine) => {
  const { coupon: _coupon, ...safe } = line;
  void _coupon;
  return safe;
};
export async function quote(items: CartLine[]) {
  if (!items.some((x) => x.coupon)) {
    const lines = validateLines(items);
    return { items: lines.map(clean), ...totals(lines) };
  }
  return db().begin(async (tx) => {
    await lock(tx);
    await expireReservations(tx);
    const priced = await priceLines(items, tx);
    return { items: priced.items.map(clean), ...totals(priced.items) };
  });
}
async function readInvoice(
  tx: TransactionSql,
  id: string,
): Promise<OrderInvoice> {
  const [o] = await tx`select * from orders where id = ${id}`;
  const rows =
    await tx`select * from order_items where order_id = ${id} order by position`;
  return {
    orderNumber: o.order_number,
    status: o.status,
    customer: o.customer_details || null,
    shippingCharge: null, // No approved shipping tariff exists; never invent a charge.
    subtotal: o.subtotal,
    discountTotal: o.discount_total,
    totalBeforeShipping: o.total_before_shipping,
    expiresAt: new Date(o.expires_at).toISOString(),
    items: rows.map((r) => ({
      sku: r.product_sku,
      name: r.product_name,
      color: r.color,
      size: r.size,
      quantity: r.quantity,
      unitPrice: r.unit_price,
      subtotal: r.subtotal,
      discountPercent: r.discount_percent,
      discountAmount: r.discount_amount,
      lineTotal: r.line_total,
      couponLabel: r.coupon_label || undefined,
    })),
  };
}
export async function checkout(items: CartLine[], idempotencyKey: string, details: CheckoutCustomer) {
  const customer = customerSchema.parse(details);
  normalizeWhatsAppNumber(brand.whatsapp); // Fail misconfiguration before creating an order.
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ items, customer }))
    .digest("hex");
  const keyHash = createHash("sha256").update(idempotencyKey).digest("hex");
  const result = await db().begin(async (tx) => {
    await lock(tx);
    await expireReservations(tx);
    const [existing] =
      await tx`select id, request_hash, status from orders where idempotency_key = ${keyHash}`;
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new StoreError(
          "Your bag or delivery details changed. Please start a new checkout.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      if (["EXPIRED", "CANCELLED"].includes(existing.status))
        throw new StoreError(
          "This order request has expired or was cancelled. Please create a new request.",
          409,
          "ORDER_EXPIRED",
        );
      return readInvoice(tx, existing.id);
    }
    const priced = await priceLines(items, tx);
    const total = totals(priced.items);
    const [order] =
      await tx`insert into orders (idempotency_key, request_hash, subtotal, discount_total, total_before_shipping, expires_at, customer_details) values (${keyHash}, ${requestHash}, ${total.subtotal}, ${total.discountTotal}, ${total.totalBeforeShipping}, now() + ${brand.reservationMinutes} * interval '1 minute', ${tx.json(customer)}) returning id`;
    for (const [position, line] of priced.items.entries()) {
      const [item] =
        await tx`insert into order_items (order_id, position, product_sku, product_name, color, size, quantity, unit_price, subtotal, discount_percent, discount_amount, line_total, coupon_label) values (${order.id}, ${position}, ${line.sku}, ${line.name}, ${line.color}, ${line.size}, ${line.quantity}, ${line.unitPrice}, ${line.subtotal}, ${line.discountPercent}, ${line.discountAmount}, ${line.lineTotal}, ${line.couponLabel || null}) returning id`;
      if (line.coupon) {
        const couponId = priced.couponIds.get(line.coupon)!;
        await tx`update coupons set status = 'RESERVED' where id = ${couponId} and status = 'AVAILABLE'`;
        await tx`insert into coupon_reservations (coupon_id, order_id, order_item_id, expires_at) select ${couponId}, id, ${item.id}, expires_at from orders where id = ${order.id}`;
      }
    }
    await tx`insert into order_events (order_id, action) values (${order.id}, 'CREATED')`;
    return readInvoice(tx, order.id);
  });
  const order = result as unknown as OrderInvoice;
  // Echo a submitted code only after its discount was validated, including identical retries.
  // Full codes are never stored in order rows; HMAC verifiers/masked labels are unchanged.
  const invoice = invoiceText({ ...order, items: order.items.map((line) => ({
    ...line,
    coupon: line.discountAmount > 0 ? items.find((item) => item.sku === line.sku && item.size === line.size)?.coupon : undefined,
  })) });
  return {
    ...order,
    invoice,
    ...whatsappHandoff(brand.whatsapp, invoice),
  };
}
export async function changeOrder(
  id: string,
  action: "CONFIRMED" | "CANCELLED" | "FULFILLED",
  actor: string,
) {
  return db().begin(async (tx) => {
    await lock(tx);
    await expireReservations(tx);
    const [order] = await tx`select * from orders where id = ${id} for update`;
    if (!order) throw new StoreError("Order not found.", 404);
    if (order.status === action) return { status: action };
    if (
      !(action === "CONFIRMED" && order.status === "PENDING") &&
      !(
        action === "CANCELLED" &&
        ["PENDING", "CONFIRMED"].includes(order.status)
      ) &&
      !(action === "FULFILLED" && order.status === "CONFIRMED")
    )
      throw new StoreError(
        "This order cannot make that status change. Refresh the order list.",
        409,
      );
    if (action === "CONFIRMED") {
      await tx`update coupons c set status = 'REDEEMED', redeemed_at = now() from coupon_reservations r where r.coupon_id = c.id and r.order_id = ${id} and r.status = 'RESERVED' and c.status = 'RESERVED'`;
      await tx`update coupon_reservations set status = 'REDEEMED' where order_id = ${id} and status = 'RESERVED'`;
    }
    if (action === "CANCELLED") {
      await tx`update coupons c set status = 'AVAILABLE' from coupon_reservations r where r.coupon_id = c.id and r.order_id = ${id} and r.status = 'RESERVED' and c.status = 'RESERVED'`;
      await tx`update coupon_reservations set status = 'RELEASED' where order_id = ${id} and status = 'RESERVED'`;
    }
    await tx`update orders set status = ${action}, confirmed_at = case when ${action} = 'CONFIRMED' then now() else confirmed_at end where id = ${id}`;
    await tx`insert into order_events (order_id, action, actor_id) values (${id}, ${action}, ${actor})`;
    return { status: action };
  });
}
export async function listOrders() {
  return db().begin(async (tx) => {
    await lock(tx);
    await expireReservations(tx);
    return tx`select o.*, coalesce((select jsonb_agg(i order by i.position) from order_items i where i.order_id = o.id), '[]') as items, coalesce((select jsonb_agg(jsonb_build_object('status',r.status,'expires_at',r.expires_at)) from coupon_reservations r where r.order_id=o.id), '[]') as reservations, coalesce((select jsonb_agg(jsonb_build_object('action',e.action,'created_at',e.created_at) order by e.created_at) from order_events e where e.order_id=o.id), '[]') as history from orders o order by o.created_at desc limit 100`;
  });
}
