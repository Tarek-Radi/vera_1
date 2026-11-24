"use client";
import { bundleOffer } from "../../lib/orders/validation";
import { databaseFreeCheckout } from "../../config/checkout";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "./CartProvider";
import { money, productBySku } from "../../lib/catalog";
import type { PricedLine } from "../../lib/orders/validation";
import { whatsappLink } from "../../config/brand";
type Quote = {
  items: PricedLine[];
  subtotal: number;
  discountTotal: number;
  totalBeforeShipping: number;
};
import { WhatsAppCheckout } from "./WhatsAppCheckout";
export function CartContents({
  compact = false,
  checkoutPage = false,
}: {
  compact?: boolean;
  checkoutPage?: boolean;
}) {
  const cart = useCart(),
    [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [checkoutBusy, setCheckoutBusy] = useState(false),
    [canResume, setCanResume] = useState(false),
    [quoteRevision, setQuoteRevision] = useState(0);
  const snapshot = JSON.stringify(cart.items);
  useEffect(() => {
    setQuote(null);
    setError("");
    setCanResume(false);
    if (!cart.items.length) return;
    if (checkoutPage && !databaseFreeCheckout) {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem("vera-checkout") || "null",
        );
        if (saved?.snapshot === snapshot && typeof saved.key === "string") {
          if (saved.result) setQuote(saved.result);
          setCanResume(true);
          setLoading(false);
          return;
        }
      } catch {
        /* Session storage is optional. */
      }
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: JSON.parse(snapshot) }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setQuote(data);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Unable to update your bag.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [snapshot, cart.items.length, checkoutPage, quoteRevision]);
  if (!cart.ready)
    return <div className="skeleton" aria-label="Loading your bag" />;
  if (!cart.items.length)
    return (
      <div className="empty-state">
        <ShoppingBag size={38} strokeWidth={1} />
        <h2>Your next favourite is waiting.</h2>
        <p>A little room for something that feels like you.</p>
        <Link
          href="/shop"
          className="button"
          onClick={() => cart.setOpen(false)}
        >
          Explore the collection <ArrowRight size={17} />
        </Link>
      </div>
    );
  const unavailable = cart.items.some(item => !productBySku(item.sku)?.available);
  const offer = bundleOffer(cart.items);
  const subtotal = cart.items.reduce(
    (n, item) => n + (productBySku(item.sku)?.priceMinor || 0) * item.quantity,
    0,
  );
  return (
    <div className={`cart-content ${compact ? "compact" : ""}`}>
      <div className="cart-lines">
        {unavailable && <p role="alert">An item in your bag is sold out. Remove it before checkout.</p>}
        {cart.items.map((item, i) => {
          const p = productBySku(item.sku);
          if (!p) return null;
          const priced = quote?.items[i];
          return (
            <article className="cart-line" key={JSON.stringify([item.sku, item.size, item.printName || ""])}>
              <Link
                href={`/products/${p.slug}`}
                onClick={() => cart.setOpen(false)}
                className="cart-line-image"
              >
                <Image src={p.images[0]} alt={p.name} fill sizes="120px" />
              </Link>
              <div className="cart-line-info">
                <div className="cart-line-title">
                  <Link
                    href={`/products/${p.slug}`}
                    onClick={() => cart.setOpen(false)}
                  >
                    {p.name}
                  </Link>
                  <button
                    className="icon-button"
                    disabled={checkoutBusy}
                    onClick={() => cart.remove(i)}
                    aria-label={`Remove ${p.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="muted">
                  {p.color} Â· {money(p.priceMinor)} each
                </p>
                <small className="sku">{p.sku}</small>
                <div className="line-controls">
                  <label>
                    <span className="sr-only">Size for {p.name}</span>
                    <select
                      disabled={checkoutBusy}
                      value={item.size}
                      onChange={(e) => cart.update(i, { size: e.target.value })}
                    >
                      {p.sizes.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <div className="quantity">
                    <button
                      aria-label={`Decrease ${p.name} quantity`}
                      disabled={checkoutBusy || item.quantity <= 1}
                      onClick={() =>
                        cart.update(i, { quantity: item.quantity - 1 })
                      }
                    >
                      <Minus size={13} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      aria-label={`Increase ${p.name} quantity`}
                      disabled={checkoutBusy || item.quantity >= 20}
                      onClick={() =>
                        cart.update(i, { quantity: item.quantity + 1 })
                      }
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <strong>
                    {money(priced?.lineTotal ?? p.priceMinor * item.quantity)}
                  </strong>
                </div>
                {!databaseFreeCheckout && (
                  <LineCoupon
                    disabled={checkoutBusy}
                    value={item.coupon || ""}
                    name={p.name}
                    update={(coupon) =>
                      cart.update(i, { coupon: coupon || undefined })
                    }
                  />
                )}
                {priced?.discountPercent ? (
                  <p className="success">
                    {priced.discountPercent}% coupon Â· Saved{" "}
                    {money(priced.discountAmount)}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
        <Link
          href="/shop"
          className="text-link"
          onClick={() => cart.setOpen(false)}
        >
          Continue exploring <ArrowRight size={16} />
        </Link>
      </div>
      <aside className="order-summary">
        <p className="eyebrow">A LITTLE CLOSER TO YOUR VERA</p>
        <h2>Order summary</h2>
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{money(quote?.subtotal ?? subtotal)}</dd>
          </div>
          <div>
            <dt>
              {offer.bundleCount ? `Hoodie + Pants Offer (${offer.bundleCount} sets)` : databaseFreeCheckout
                ? "Coupon codes unavailable"
                : "Coupon discount"}
            </dt>
            <dd>
              {loading
                ? "Checkingâ€¦"
                : quote
                  ? `âˆ’${money(quote.discountTotal)}`
                  : canResume
                    ? "Reopen invoice to confirm"
                    : error ? "Validation failed — retry below" : "Validating your order..."}
            </dd>
          </div>
          <div className="shipping-row">
            <dt>Shipping</dt>
            <dd>To be confirmed via WhatsApp</dd>
          </div>
          <div className="total">
            <dt>Total before shipping</dt>
            <dd>{money(quote?.totalBeforeShipping ?? Math.max(0, subtotal - offer.bundleDiscount))}</dd>
          </div>
        </dl>
        {error && (
          <div className="form-error" role="alert">
            {error}
            <br />
            <button
              type="button"
              className="text-link"
              disabled={loading || checkoutBusy}
              onClick={() => setQuoteRevision((value) => value + 1)}
            >
              Retry validation
            </button>
            <br />
            <a href={whatsappLink} target="_blank" rel="noreferrer">
              Contact VERA
            </a>
          </div>
        )}
        {checkoutPage ? (
          <>
            <WhatsAppCheckout
              key={snapshot}
              items={cart.items}
              ready={!unavailable && !loading && (!!quote || canResume)}
              onValidated={setQuote}
              onBusyChange={setCheckoutBusy}
              onAttemptCleared={() => setQuoteRevision((value) => value + 1)}
            />
            <p className="terms-note">
              Review our <Link href="/terms">terms</Link>,{" "}
              <Link href="/privacy">privacy notice</Link> and{" "}
              <Link href="/return-policy">returns information</Link> before
              requesting an order.
            </p>
          </>
        ) : (
          <>
            <Link
              href="/checkout"
              className="button full-width"
              onClick={() => cart.setOpen(false)}
            >
              Proceed to checkout <ArrowRight size={17} />
            </Link>
            {compact && (
              <Link
                href="/cart"
                className="text-link centered"
                onClick={() => cart.setOpen(false)}
              >
                View your bag
              </Link>
            )}
            <p className="checkout-note">
              Payment & delivery, personally arranged on WhatsApp.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
function LineCoupon({
  disabled,
  value,
  name,
  update,
}: {
  disabled: boolean;
  value: string;
  name: string;
  update: (value: string) => void;
}) {
  const [input, setInput] = useState(value);
  return (
    <div className="line-coupon">
      <div className="input-button">
        <input
          disabled={disabled}
          aria-label={`Coupon for ${name}`}
          placeholder="Private coupon code"
          value={input}
          maxLength={64}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          disabled={disabled}
          onClick={() => update(input.trim().toUpperCase())}
        >
          Apply
        </button>
        {value && (
          <button
            disabled={disabled}
            aria-label={`Remove coupon for ${name}`}
            onClick={() => {
              setInput("");
              update("");
            }}
          >
            Ã—
          </button>
        )}
      </div>
      {value && <small>Selected code: {value}</small>}
    </div>
  );
}
