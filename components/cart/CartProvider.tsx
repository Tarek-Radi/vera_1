"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { productBySku } from "../../lib/catalog";
import type { CartLine } from "../../lib/orders/validation";
type CartContextValue = {
  items: CartLine[];
  ready: boolean;
  open: boolean;
  setOpen: (value: boolean) => void;
  add: (line: CartLine) => boolean;
  update: (index: number, patch: Partial<CartLine>) => void;
  remove: (index: number) => void;
  clear: () => void;
  notice: string;
  setNotice: (s: string) => void;
};
const CartContext = createContext<CartContextValue | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem("vera-bag-v1") || "[]",
      );
      if (Array.isArray(saved)) {
        const seen = new Set<string>();
        setItems(
          saved.slice(0, 20).flatMap((x) => {
            if (!x || typeof x !== "object") return [];
            const p = productBySku(x.sku),
              key = `${x.sku}:${x.size}`;
            if (
              !p ||
              !p.sizes.includes(x.size) ||
              !Number.isInteger(x.quantity) ||
              x.quantity < 1 ||
              x.quantity > 20 ||
              seen.has(key)
            )
              return [];
            seen.add(key);
            return [
              {
                sku: p.sku,
                size: x.size,
                quantity: x.quantity,
                ...(typeof x.coupon === "string" &&
                /^[A-Z0-9-]{8,64}$/.test(x.coupon)
                  ? { coupon: x.coupon }
                  : {}),
              },
            ];
          }),
        );
      }
    } catch {
      /* An unavailable/corrupted storage never blocks shopping. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("vera-bag-v1", JSON.stringify(items));
      } catch {
        /* private browsing */
      }
    }
  }, [items, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  function add(line: CartLine) {
    const existing = items.find(
      (x) => x.sku === line.sku && x.size === line.size,
    );
    if (
      existing &&
      existing.coupon !== line.coupon &&
      (existing.coupon || line.coupon)
    ) {
      setNotice(
        "This item is already in your bag. Edit its coupon there to avoid stacking.",
      );
      return false;
    }
    if (
      line.coupon &&
      items.some((x) => x !== existing && x.coupon === line.coupon)
    ) {
      setNotice("That coupon is already applied to another item.");
      return false;
    }
    if (
      (!existing && items.length >= 20) ||
      (existing?.quantity || 0) + line.quantity > 20
    ) {
      setNotice("A bag can hold up to 20 items, with 20 units per item.");
      return false;
    }
    setItems(
      existing
        ? items.map((x) =>
            x === existing ? { ...x, quantity: x.quantity + line.quantity } : x,
          )
        : [...items, line],
    );
    setNotice("Added to your bag.");
    return true;
  }
  function update(index: number, patch: Partial<CartLine>) {
    const next = { ...items[index], ...patch };
    if (
      !productBySku(next.sku)?.sizes.includes(next.size) ||
      next.quantity < 1 ||
      next.quantity > 20
    )
      return;
    if (
      items.some(
        (x, i) =>
          i !== index &&
          ((x.sku === next.sku && x.size === next.size) ||
            (next.coupon && x.coupon === next.coupon)),
      )
    ) {
      setNotice("That size or coupon is already in another bag item.");
      return;
    }
    setItems(items.map((x, i) => (i === index ? next : x)));
  }
  return (
    <CartContext.Provider
      value={{
        items,
        ready,
        open,
        setOpen,
        add,
        update,
        remove: (index) => setItems(items.filter((_, i) => i !== index)),
        clear: () => setItems([]),
        notice,
        setNotice,
      }}
    >
      {children}
      <div className={`toast ${notice ? "visible" : ""}`} role="status">
        {notice}
      </div>
    </CartContext.Provider>
  );
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider missing");
  return context;
}
