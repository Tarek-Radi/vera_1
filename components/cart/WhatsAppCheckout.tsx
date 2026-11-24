"use client";
import { personalizationNotes } from "../../lib/orders/personalization";
import { databaseFreeCheckout } from "../../config/checkout";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  customerSchema,
  type CheckoutCustomer,
} from "../../lib/orders/customer";
import type { CartLine } from "../../lib/orders/validation";
import type { OrderInvoice } from "../../lib/orders/invoice";
import { whatsappHandoff } from "../../lib/whatsapp";
import { brand } from "../../config/brand";
type Result = OrderInvoice & {
  saved?: boolean;
  invoice: string;
  whatsappUrl: string;
  requiresCopy: boolean;
};
type Attempt = {
  snapshot: string;
  payload: string;
  key: string;
  result?: Result;
};
const empty: CheckoutCustomer = {
  name: "",
  phone: "",
  governorate: "",
  area: "",
  address: "",
  paymentPreference: "",
  notes: "",
};
function read(key: string) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
export function WhatsAppCheckout({
  items,
  ready,
  onValidated,
  onBusyChange,
  onAttemptCleared,
}: {
  items: CartLine[];
  ready: boolean;
  onValidated: (r: Result) => void;
  onBusyChange: (v: boolean) => void;
  onAttemptCleared: () => void;
}) {
  const [customer, setCustomer] = useState(empty),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false),
    active = useRef(false),
    attempt = useRef<Attempt | null>(null),
    message = useRef<HTMLTextAreaElement>(null);
  const autoNotes = personalizationNotes(items);
  const snapshot = JSON.stringify(items);
  useEffect(() => {
    active.current = true;
    const draft = read("vera-checkout-details");
    const restored = Object.fromEntries(
      Object.keys(empty).map((k) => [
        k,
        typeof draft?.[k] === "string" ? draft[k].slice(0, 600) : "",
      ]),
    ) as CheckoutCustomer;
    setCustomer(restored);
    const parsed = customerSchema.safeParse(restored),
      saved = read("vera-checkout");
    if (
      !databaseFreeCheckout &&
      parsed.success &&
      saved?.snapshot === snapshot &&
      saved.payload ===
        JSON.stringify({
          items: JSON.parse(snapshot),
          customer: parsed.data,
        }) &&
      typeof saved.key === "string"
    ) {
      attempt.current = saved;
      if (
        saved.result &&
        typeof saved.result.invoice === "string" &&
        Date.parse(saved.result.expiresAt) > Date.now()
      ) {
        const restoredResult = {
          ...saved.result,
          ...whatsappHandoff(brand.whatsapp, saved.result.invoice),
        };
        setResult(restoredResult);
        onValidated(restoredResult);
      }
    }
    setLoaded(true);
    return () => {
      active.current = false;
    };
  }, [snapshot, onValidated]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    const parsed = customerSchema.safeParse(customer);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    const body = { items, customer: parsed.data },
      payload = JSON.stringify(body);
    const previous = attempt.current || read("vera-checkout");
    const current: Attempt = {
      snapshot,
      payload,
      key: previous?.payload === payload ? previous.key : crypto.randomUUID(),
    };
    attempt.current = current;
    save("vera-checkout", current);
    save("vera-checkout-details", parsed.data);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, idempotencyKey: current.key }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (["ORDER_EXPIRED", "IDEMPOTENCY_CONFLICT"].includes(data.code)) {
          attempt.current = null;
          save("vera-checkout", null);
          if (active.current) onAttemptCleared();
        }
        throw new Error(data.error || "Please check your details and retry.");
      }
      const prepared: Result = {
        ...data,
        ...whatsappHandoff(brand.whatsapp, data.invoice),
      };
      attempt.current = { ...current, result: prepared };
      if (!databaseFreeCheckout) save("vera-checkout", attempt.current);
      if (!active.current) return;
      setResult(prepared);
      onValidated(prepared);
      if (!prepared.requiresCopy) {
        try {
          window.location.assign(prepared.whatsappUrl);
        } catch {
          setError(
            "WhatsApp could not open. Use the open or copy actions below.",
          );
        }
      }
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error
            ? e.message
            : "Check your connection and retry the same order.",
        );
    } finally {
      pending.current = false;
      if (active.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }
  const fields = [
    ["name", "Customer name", 100],
    ["phone", "Mobile number", 24],
    ["governorate", "Governorate", 80],
    ["area", "City / area", 100],
    ["address", "Full shipping address", 350],
    ["paymentPreference", "Payment preference (optional)", 80],
    ["notes", "Order notes (optional)", 600],
  ] as const;
  return (
    <>
      <form className="checkout-form" onSubmit={submit} aria-busy={busy}>
        {autoNotes && <div><strong>Personalization added to order notes</strong><p style={{ whiteSpace: "pre-line" }}>{autoNotes}</p></div>}
        <h3>Delivery details</h3>
        <p className="muted">
          Your details are saved with your order and included in WhatsApp.
          Shipping and payment arrangements need VERA’s confirmation.
        </p>
        <fieldset disabled={busy || !loaded}>
          {fields.map(([key, label, max]) => (
            <label key={key}>
              {label}
              <input
                name={key}
                type={key === "phone" ? "tel" : "text"}
                dir="auto"
                value={customer[key]}
                required={!["paymentPreference", "notes"].includes(key)}
                maxLength={max}
                onChange={(e) => {
                  const changed = { ...customer, [key]: e.target.value };
                  setCustomer(changed);
                  save("vera-checkout-details", changed);
                  setResult(null);
                  setError("");
                }}
              />
            </label>
          ))}
        </fieldset>
        <p className="checkout-note">
          {databaseFreeCheckout
            ? "Orders are followed up through WhatsApp. No central order history is saved; opening the chat does not prove delivery or payment."
            : `This prepares an order awaiting confirmation. Coupon reservations last ${brand.reservationMinutes} minutes.`}
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {!result && (
          <button
            className="button full-width"
            disabled={busy || !loaded || !ready}
            type="submit"
          >
            {busy ? "Preparing your order…" : "Complete order via WhatsApp"}
          </button>
        )}
      </form>
      {result && (
        <section className="invoice-ready" aria-label="Prepared order">
          <h3>
            {databaseFreeCheckout
              ? "WhatsApp summary ready"
              : `Order prepared · ${result.orderNumber}`}
          </h3>
          <p>Please press Send in WhatsApp to submit your order to VERA.</p>
          {result.requiresCopy && (
            <p role="status" lang="ar" dir="rtl">
              الطلب أطول من رابط واتساب المضمون. انسخ تفاصيل الطلب كاملة، وافتح
              واتساب والصقها قبل الإرسال. مفيش منتجات اتحذفت.
            </p>
          )}
          <a className="button full-width" href={result.whatsappUrl} lang="ar">
            فتح واتساب
          </a>
          <button
            className="button secondary full-width"
            type="button"
            lang="ar"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result.invoice);
                setNotice("تم نسخ تفاصيل الطلب.");
              } catch {
                message.current?.focus();
                message.current?.select();
                setNotice("انسخ النص المحدد يدويًا والصقه في واتساب.");
              }
            }}
          >
            نسخ تفاصيل الطلب
          </button>
          <p className="muted">
            If WhatsApp does not open, use these actions again. Your bag and
            details stay here.
          </p>
          <label className="checkout-message">
            Order message
            <textarea
              ref={message}
              readOnly
              value={result.invoice}
              lang="ar"
              dir="rtl"
              rows={10}
              onFocus={(e) => e.target.select()}
            />
          </label>
          {notice && (
            <p role="status" dir="rtl">
              {notice}
            </p>
          )}
        </section>
      )}
    </>
  );
}
