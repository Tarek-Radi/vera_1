import { CartContents } from "../../components/cart/CartContents";
export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};
export default function CheckoutPage() {
  return (
    <div className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">ONE CONVERSATION AWAY</p>
        <h1>
          Make it yours<span>.</span>
        </h1>
        <p>
          Review your pieces. We’ll take it from here, together on WhatsApp.
        </p>
      </header>
      <CartContents checkoutPage />
    </div>
  );
}
