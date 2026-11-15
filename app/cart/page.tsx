import { CartContents } from "../../components/cart/CartContents";
export const metadata = {
  title: "Your bag",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart" },
};
export default function CartPage() {
  return (
    <div className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">GOOD CHOICES, ALL YOURS</p>
        <h1>
          Your bag<span>.</span>
        </h1>
      </header>
      <CartContents />
    </div>
  );
}
