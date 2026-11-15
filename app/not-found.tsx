import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state page-shell">
      <p className="eyebrow">404 / A DIFFERENT DIRECTION</p>
      <h1>This piece is missing.</h1>
      <p>The page may have moved. There’s more to explore in the collection.</p>
      <Link href="/shop" className="button">
        Back to shop
      </Link>
    </div>
  );
}
