"use client";
import { scarfWording } from "../../lib/product-wording.mjs";
import type { CheckoutCustomer } from "../../lib/orders/customer";
import { useCallback, useEffect, useState } from "react";
import { money } from "../../lib/catalog";
type AdminOrder = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount_total: number;
  total_before_shipping: number;
  created_at: string;
  customer_details: CheckoutCustomer | null;
  items: {
    product_sku: string;
    product_name: string;
    color: string;
    size: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    discount_amount: number;
    line_total: number;
    coupon_label: string | null;
  }[];
  reservations: { status: string; expires_at: string }[];
  history: { action: string; created_at: string }[];
};
export function AdminDashboard({ configured }: { configured: boolean }) {
  const [authenticated, setAuthenticated] = useState(false),
    [orders, setOrders] = useState<AdminOrder[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [filter, setFilter] = useState("ALL");
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setAuthenticated(true);
        setOrders(data.orders);
      } else {
        setAuthenticated(false);
        if (res.status !== 401) setError(data.error);
      }
    } catch {
      setError(
        "Unable to load orders. Please check your connection and try again.",
      );
    }
  }, []);
  useEffect(() => {
    if (configured) void load();
  }, [configured, load]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPassword("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  async function action(id: string, action: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update order.");
    } finally {
      setBusy(false);
    }
  }
  if (!configured)
    return (
      <div className="help-callout">
        <h2>Owner sign-in is not configured yet.</h2>
        <p>
          Connect Supabase Auth and the store database using the setup
          instructions in the project README. No order data is accessible here
          until setup is complete.
        </p>
      </div>
    );
  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!authenticated ? (
        <form className="login-form" onSubmit={login}>
          <h2>Owner sign-in</h2>
          <p>Use your authorised VERA owner account.</p>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <>
          <div className="admin-toolbar">
            <label>
              Order status
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {[
                  "ALL",
                  "PENDING",
                  "CONFIRMED",
                  "FULFILLED",
                  "CANCELLED",
                  "EXPIRED",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void load()}
            >
              Refresh
            </button>
            <button
              className="text-link"
              onClick={async () => {
                await fetch("/api/admin/session", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: "{}",
                });
                setOrders([]);
                setAuthenticated(false);
              }}
            >
              Sign out
            </button>
          </div>
          <p className="muted">
            Latest 100 orders. Confirm only after agreeing the order with the
            customer in WhatsApp. Confirmation permanently redeems reserved
            coupons; payment and shipping remain unconfirmed.
          </p>
          {orders
            .filter((o) => filter === "ALL" || o.status === filter)
            .map((o) => (
              <article className="admin-order" key={o.id}>
                <div className="admin-order-header">
                  <div>
                    <h2>{o.order_number}</h2>
                    <small>
                      {new Date(o.created_at).toLocaleString("en-GB", {
                        timeZone: "Africa/Cairo",
                      })}{" "}
                      · Cairo
                    </small>
                  </div>
                  <span className="status-badge">{o.status}</span>
                  <strong>{money(o.total_before_shipping)}</strong>
                </div>
                {o.customer_details && (
                  <div style={{ overflowWrap: "anywhere" }}>
                    <h3>Customer & delivery</h3>
                    <p dir="auto">
                      {o.customer_details.name} · {o.customer_details.phone}
                    </p>
                    <p dir="auto">
                      {o.customer_details.governorate} ·{" "}
                      {o.customer_details.area} · {o.customer_details.address}
                    </p>
                    {o.customer_details.paymentPreference && (
                      <p>
                        Payment preference:{" "}
                        {o.customer_details.paymentPreference}
                      </p>
                    )}
                    {o.customer_details.notes && (
                      <p dir="auto">{o.customer_details.notes}</p>
                    )}
                  </div>
                )}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Item / SKU</th>
                        <th>Colour / Size</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Coupon</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.items.map((x, i) => (
                        <tr key={i}>
                          <td>
                            {scarfWording(x.product_name)}
                            <small>{x.product_sku}</small>
                          </td>
                          <td>
                            {x.color} / {x.size}
                          </td>
                          <td>{x.quantity}</td>
                          <td>{money(x.unit_price)}</td>
                          <td>
                            {x.discount_percent
                              ? `${x.coupon_label} · ${x.discount_percent}% · −${money(x.discount_amount)}`
                              : "—"}
                          </td>
                          <td>{money(x.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  Subtotal: {money(o.subtotal)} · Coupon savings:{" "}
                  {money(o.discount_total)} · Shipping / payment: unconfirmed
                </p>
                {o.reservations.map((r, i) => (
                  <p className="note" key={i}>
                    Coupon {r.status.toLowerCase()} · Reservation expiry{" "}
                    {new Date(r.expires_at).toLocaleString("en-GB", {
                      timeZone: "Africa/Cairo",
                    })}{" "}
                    Cairo
                  </p>
                ))}
                <details>
                  <summary>Order history</summary>
                  {o.history.map((e, i) => (
                    <p key={i}>
                      {e.action} ·{" "}
                      {new Date(e.created_at).toLocaleString("en-GB", {
                        timeZone: "Africa/Cairo",
                      })}
                    </p>
                  ))}
                </details>
                <div className="admin-actions">
                  {o.status === "PENDING" && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => action(o.id, "CONFIRMED")}
                    >
                      Confirm & redeem coupons
                    </button>
                  )}
                  {o.status === "CONFIRMED" && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => action(o.id, "FULFILLED")}
                    >
                      Mark fulfilled
                    </button>
                  )}
                  {["PENDING", "CONFIRMED"].includes(o.status) && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => action(o.id, "CANCELLED")}
                    >
                      Cancel order
                    </button>
                  )}
                </div>
              </article>
            ))}
          {!orders.length && (
            <div className="empty-state">
              <h2>No orders yet.</h2>
              <p>New order requests will appear here.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
