import { ProductGrid } from "../../components/products/ProductGrid";
export const metadata = {
  title: "Shop the collection",
  description:
    "Explore VERA hoodies, scarves and everyday pieces. Find your colour and style.",
  alternates: { canonical: "/shop" },
};
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">YOUR EVERYDAY, YOUR WAY</p>
        <h1>
          The collection<span>.</span>
        </h1>
        <p>Find the pieces that feel like you.</p>
      </header>
      <ProductGrid
        key={q || ""}
        initialSearch={typeof q === "string" ? q : ""}
      />
    </div>
  );
}
