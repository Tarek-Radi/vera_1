"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Ruler,
  ZoomIn,
  MessageCircle,
} from "lucide-react";
import { type Product, colorHex, money } from "../../lib/catalog";
import { useCart } from "../cart/CartProvider";
import { Modal } from "../ui/Modal";
import { Price } from "./ProductCard";
export function ProductDetail({
  product,
  variants,
}: {
  product: Product;
  variants: Product[];
}) {
  const cart = useCart(),
    router = useRouter();
  const touchStart = useRef(0);
  const swiped = useRef(false);
  const [size, setSize] = useState(
      product.sizes.length === 1 ? product.sizes[0] : "",
    ),
    [quantity, setQuantity] = useState(1),
    [activeImage, setImage] = useState(0),
    [zoom, setZoom] = useState(false),
    [error, setError] = useState(""),
    [coupon, setCoupon] = useState(""),
    [couponResult, setCouponResult] = useState<{
      code: string;
      percent: number;
      savings: number;
      total: number;
    } | null>(null),
    [checking, setChecking] = useState(false);
  function add(buy: boolean) {
    if (!size) {
      setError("Please select your size.");
      return;
    }
    if (!product.available) return;
    setError("");
    if (
      cart.add({
        sku: product.sku,
        size,
        quantity,
        ...(couponResult ? { coupon: couponResult.code } : {}),
      })
    ) {
      if (buy) router.push("/checkout");
      else cart.setOpen(true);
    }
  }
  async function applyCoupon() {
    if (!size) {
      setError("Select your size before checking a coupon.");
      return;
    }
    setChecking(true);
    setError("");
    setCouponResult(null);
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              sku: product.sku,
              size,
              quantity,
              coupon: coupon.trim().toUpperCase(),
            },
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCouponResult({
        code: coupon.trim().toUpperCase(),
        percent: data.items[0].discountPercent,
        savings: data.discountTotal,
        total: data.totalBeforeShipping,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to check this coupon.");
    } finally {
      setChecking(false);
    }
  }
  return (
    <div className="product-detail">
      <div className="product-gallery">
        <button
          className="gallery-main"
          onClick={() => {
            if (!swiped.current) setZoom(true);
            swiped.current = false;
          }}
          onTouchStart={(e) => {
            touchStart.current = e.touches[0].clientX;
            swiped.current = false;
          }}
          onTouchEnd={(e) => {
            const delta = e.changedTouches[0].clientX - touchStart.current;
            if (Math.abs(delta) > 45 && product.images.length > 1) {
              swiped.current = true;
              setImage(
                (i) =>
                  (i + (delta < 0 ? 1 : -1) + product.images.length) %
                  product.images.length,
              );
            }
          }}
          aria-label={`Zoom ${product.name}`}
        >
          <Image
            src={product.images[activeImage]}
            alt={product.name}
            fill
            preload
            sizes="(max-width: 800px) 100vw, 55vw"
          />
          <span>
            <ZoomIn size={17} /> View closer
          </span>
        </button>
        {product.images.length > 1 && (
          <div className="gallery-thumbnails">
            {product.images.map((src, i) => (
              <button
                key={src}
                onClick={() => setImage(i)}
                className={activeImage === i ? "selected" : ""}
                aria-label={`View image ${i + 1}`}
              >
                <Image
                  src={src}
                  alt={`${product.name}, view ${i + 1}`}
                  width={90}
                  height={110}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-info">
        <p className="eyebrow">THE VERA COLLECTION / {product.categoryLabel}</p>
        <h1>{product.name}</h1>
        <Price product={product} />
        <p className="product-description">{product.description}</p>
        <div className="product-options">
          <span className="field-label">
            COLOUR <strong>{product.color}</strong>
          </span>
          <div className="swatches">
            {(variants.length ? variants : [product]).map((p) => (
              <Link
                href={`/products/${p.slug}`}
                key={p.sku}
                title={p.color}
                aria-label={`${p.color}${p.sku === product.sku ? ", selected" : ""}`}
                className={`swatch ${p.sku === product.sku ? "selected" : ""}`}
                style={{ background: colorHex[p.color] || "#84919d" }}
              >
                {p.sku === product.sku && (
                  <Check
                    size={15}
                    style={{ color: p.color === "White" ? "#071a32" : "#fff" }}
                  />
                )}
              </Link>
            ))}
          </div>
          <div className="size-label">
            <span className="field-label">
              SIZE <strong>{size || "Select a size"}</strong>
            </span>
            <Link href="/size-guide">
              <Ruler size={15} /> Size guide
            </Link>
          </div>
          <div className="size-options">
            {product.sizes.map((s) => (
              <button
                key={s}
                className={s === size ? "selected" : ""}
                aria-pressed={s === size}
                onClick={() => {
                  setSize(s);
                  setError("");
                  setCouponResult(null);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="purchase-row">
            <div className="quantity">
              <button
                aria-label="Decrease quantity"
                disabled={quantity === 1}
                onClick={() => {
                  setQuantity(quantity - 1);
                  setCouponResult(null);
                }}
              >
                <Minus size={15} />
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                aria-label="Increase quantity"
                disabled={quantity === 20}
                onClick={() => {
                  setQuantity(quantity + 1);
                  setCouponResult(null);
                }}
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              className="button add-to-cart"
              disabled={!product.available}
              onClick={() => add(false)}
            >
              {product.available ? "Add to bag" : "Currently unavailable"}
              <Plus size={17} />
            </button>
          </div>
          <button
            className="button secondary full-width"
            disabled={!product.available}
            onClick={() => add(true)}
          >
            Buy now <ArrowRight size={17} />
          </button>
          <p className="availability">
            <span />
            {product.available
              ? "Available to order · Confirmed by VERA on WhatsApp"
              : "Currently unavailable"}
          </p>
        </div>
        <div className="coupon-box">
          <label htmlFor="product-coupon">Have a private coupon?</label>
          <div className="input-button">
            <input
              id="product-coupon"
              value={coupon}
              onChange={(e) => {
                setCoupon(e.target.value);
                setCouponResult(null);
              }}
              placeholder="Enter your code"
              maxLength={64}
              autoComplete="off"
            />
            <button disabled={checking || !coupon.trim()} onClick={applyCoupon}>
              {checking ? "Checking…" : "Apply"}
            </button>
          </div>
          {couponResult && (
            <p className="success" role="status">
              {couponResult.percent}% applied · Save{" "}
              {money(couponResult.savings)}
              <br />
              Item total: {money(couponResult.total)}
            </p>
          )}
          <small>
            A coupon applies to this item and its selected quantity.
            Availability is rechecked at checkout.
          </small>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="product-assurance">
          <MessageCircle size={19} />
          <p>
            Finish your order with a conversation.
            <span>Payment and delivery are confirmed through WhatsApp.</span>
          </p>
        </div>
        <details className="detail-accordion">
          <summary>Product details</summary>
          <p>{product.description}</p>
          <p>
            Colour: {product.color}. Available sizes: {product.sizes.join(", ")}
            . Ask VERA about composition and care before ordering.
          </p>
        </details>
        <details className="detail-accordion">
          <summary>Delivery & returns</summary>
          <p>
            Delivery fees and timing are confirmed through WhatsApp.{" "}
            <Link href="/shipping">Delivery information</Link> ·{" "}
            <Link href="/return-policy">Returns & exchanges</Link>
          </p>
        </details>
        <p className="sku">PRODUCT CODE · {product.sku}</p>
      </div>
      <Modal
        title={product.name}
        open={zoom}
        onClose={() => setZoom(false)}
        className="zoom-modal"
      >
        <div className="zoom-image">
          <Image
            src={product.images[activeImage]}
            alt={`${product.name}, enlarged`}
            width={1200}
            height={1600}
            sizes="90vw"
          />
        </div>
      </Modal>
      <div className="mobile-purchase">
        <span>
          {product.name}
          <strong>{money(product.priceMinor)}</strong>
        </span>
        <button
          className="button"
          aria-label="Add selected item from purchase bar"
          disabled={!product.available}
          onClick={() => {
            if (!size)
              document
                .querySelector(".size-options")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            add(false);
          }}
        >
          {size ? "Add to bag" : "Choose size"} <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
