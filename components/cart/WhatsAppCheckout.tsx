"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Copy } from "lucide-react";
import { brand } from "../../config/brand";
import { customerSchema, type CartLine, type CheckoutCustomer } from "../../lib/orders/validation";
import type { OrderInvoice } from "../../lib/orders/invoice";
import { whatsappHandoff } from "../../lib/whatsapp";

type CheckoutResult = OrderInvoice & { invoice: string; whatsappUrl: string; requiresCopy: boolean };
type Attempt = { snapshot: string; payloadSnapshot: string; key: string; result?: CheckoutResult };
const empty: CheckoutCustomer = { name: "", phone: "", governorate: "", area: "", address: "", paymentPreference: "", notes: "" };
const draftKey = "vera-checkout-details";
function read(key: string) {
  try { return JSON.parse(sessionStorage.getItem(key) || "null"); } catch { return null; }
}
function save(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Memory still supports retries in this tab. */ }
}

export function WhatsAppCheckout({ items, ready, onValidated, onBusyChange, onAttemptCleared }: {
  items: CartLine[];
  ready: boolean;
  onValidated: (order: CheckoutResult) => void;
  onBusyChange: (busy: boolean) => void;
  onAttemptCleared: () => void;
}) {
  const [customer, setCustomer] = useState<CheckoutCustomer>(empty);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [resume, setResume] = useState(false);
  const attempt = useRef<Attempt | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const messageBox = useRef<HTMLTextAreaElement>(null);
  const snapshot = JSON.stringify(items);
  useEffect(() => {
    mounted.current = true;
    const draft = read(draftKey);
    const restored = Object.fromEntries(Object.keys(empty).map((key) => [key, typeof draft?.[key] === "string" ? draft[key].slice(0, 600) : ""])) as CheckoutCustomer;
    setCustomer(restored);
    const validated = customerSchema.safeParse(restored);
    const saved = read("vera-checkout");
    if (validated.success && saved?.snapshot === snapshot && saved.payloadSnapshot === JSON.stringify({ items: JSON.parse(snapshot), customer: validated.data }) && /^[\da-f-]{36}$/i.test(saved.key)) {
      attempt.current = saved;
      setResume(true);
      const order = saved.result;
      if (order && typeof order.invoice === "string" && /^VERA-\d+$/.test(order.orderNumber) && Date.parse(order.expiresAt) > Date.now()) {
        // Rebuild the URL with our configured destination; never trust a stored href.
        setResult({ ...order, ...whatsappHandoff(brand.whatsapp, order.invoice) });
        onValidated(order);
      }
    }
    setLoaded(true);
    return () => { mounted.current = false; };
  }, [snapshot, onValidated]);

  function update(field: keyof CheckoutCustomer, value: string) {
    const changed = { ...customer, [field]: value };
    setCustomer(changed);
    save(draftKey, changed);
    setResult(null);
    setResume(false);
    setError("");
    setNotice("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const validated = customerSchema.safeParse(customer);
    if (!validated.success) { setError(validated.error.issues[0].message); return; }
    inFlight.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    const payload = { items, customer: validated.data };
    const payloadSnapshot = JSON.stringify(payload);
    const previous = attempt.current || read("vera-checkout");
    const current: Attempt = { snapshot, payloadSnapshot, key: previous?.payloadSnapshot === payloadSnapshot ? previous.key : crypto.randomUUID() };
    attempt.current = current;
    save("vera-checkout", current); // Persist before sending, so a lost response can be retried safely.
    save(draftKey, validated.data);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey: current.key }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (["ORDER_EXPIRED", "IDEMPOTENCY_CONFLICT"].includes(data.code)) {
          attempt.current = null;
          try { sessionStorage.removeItem("vera-checkout"); } catch {}
          if (mounted.current) { setResume(false); onAttemptCleared(); }
        }
        throw new Error(data.error || "Please check your details and try again.");
      }
      const order: CheckoutResult = { ...data, ...whatsappHandoff(brand.whatsapp, data.invoice) };
      save("vera-checkout", { ...current, result: order });
      attempt.current = { ...current, result: order };
      if (!mounted.current) return;
      setResult(order);
      setResume(true);
      onValidated(order);
      if (!order.requiresCopy) {
        // Same-tab navigation is not subject to delayed window.open popup blocking.
        // The cart, form and prepared summary are saved before leaving.
        try { window.location.assign(order.whatsappUrl); }
        catch { setError("WhatsApp could not open. Use the actions below to open it or copy your order."); }
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Unable to prepare your order. Check your connection and retry; the same request will be reused.");
    } finally {
      inFlight.current = false;
      if (mounted.current) { setBusy(false); onBusyChange(false); }
    }
  }
  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.invoice); setNotice("تم نسخ تفاصيل الطلب. افتح واتساب والصق الرسالة، وبعد المراجعة اضغط إرسال."); }
    catch {
      messageBox.current?.focus();
      messageBox.current?.select();
      setNotice("النسخ التلقائي مش متاح. حدّدنا الرسالة كاملة؛ انسخها يدويًا والصقها في واتساب.");
    }
  }
  const fields = [
    ["name", "Customer name", 100, "name"],
    ["phone", "Mobile number", 24, "tel"],
    ["governorate", "Governorate", 80, "address-level1"],
    ["area", "City / area", 100, "address-level2"],
    ["address", "Full shipping address", 350, "street-address"],
    ["paymentPreference", "Payment preference (optional)", 80, "off"],
    ["notes", "Order notes (optional)", 600, "off"],
  ] as const;
  return <>
    <form className="checkout-form" onSubmit={submit} aria-busy={busy}>
      <h3>Delivery details</h3>
      <p className="muted">Your details will be saved with the order and included in the WhatsApp message. Shipping and payment arrangements need VERA’s confirmation.</p>
      <fieldset disabled={busy || !loaded}>
        {fields.map(([field, label, maxLength, autoComplete]) => <label key={field}>
          {label}
          <input name={field} type={field === "phone" ? "tel" : "text"} dir={field === "phone" ? "ltr" : "auto"}
            value={customer[field]} onChange={(event) => update(field, event.target.value)}
            required={!["paymentPreference", "notes"].includes(field)} minLength={field === "address" ? 8 : undefined}
            maxLength={maxLength} autoComplete={autoComplete} />
        </label>)}
      </fieldset>
      <p className="checkout-note">This prepares an order awaiting confirmation. It does not send a message or record payment. Coupon reservations last {brand.reservationMinutes} minutes.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!result && <button className="button full-width" type="submit" disabled={busy || !loaded || (!ready && !resume)}>
        {busy ? "Preparing your order…" : resume ? "Reopen order summary" : "Complete order via WhatsApp"} <ArrowRight size={17} />
      </button>}
    </form>
    {result && <section className="invoice-ready" aria-label="Prepared order">
      <h3>Order prepared · {result.orderNumber}</h3>
      <p>Please press Send in WhatsApp to submit your order to VERA.</p>
      {result.requiresCopy && <p className="checkout-long-message" role="status" lang="ar" dir="rtl">تفاصيل الطلب أطول من رابط واتساب المضمون. انسخ الرسالة كاملة من هنا، افتح واتساب والصقها، وبعدين اضغط إرسال. مفيش أي منتج اتحذف من الملخص.</p>}
      <a className="button full-width" href={result.whatsappUrl} lang="ar" dir="rtl">فتح واتساب <ArrowRight size={17} /></a>
      <button className="button secondary full-width" type="button" onClick={copy} lang="ar" dir="rtl">نسخ تفاصيل الطلب <Copy size={16} /></button>
      <p className="muted">If WhatsApp does not open, use these actions again. Your bag and delivery details stay here. This is a request summary, not proof of payment.</p>
      <label className="checkout-message">Order message
        <textarea ref={messageBox} value={result.invoice} readOnly lang="ar" dir="rtl" rows={10} onFocus={(event) => event.target.select()} />
      </label>
      {notice && <p role="status" lang="ar" dir="rtl">{notice}</p>}
    </section>}
  </>;
}
