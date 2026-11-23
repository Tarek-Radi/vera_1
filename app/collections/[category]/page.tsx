import { notFound } from "next/navigation";
import { categories } from "../../../lib/catalog";
import { ProductGrid } from "../../../components/products/ProductGrid";
export const dynamicParams = false;
export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const c = categories.find((c) => c.slug === category);
  return {
    title: c?.label || "Collection",
    description: `Explore the ${c?.label || ""} collection from VERA. Find your colour and make it yours.`,
    alternates: { canonical: `/collections/${category}` },
  };
}
export default async function Collection({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const c = categories.find((c) => c.slug === category);
  if (!c) notFound();
  return (
    <div className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">THE VERA COLLECTION</p>
        <h1>
          {c.label}
          <span>.</span>
        </h1>
        <p>
          {category === "pants"
            ? "Everyday sweatpants. Find your colour and complete your look."
            : "Considered colours. An expression of you."}
        </p>
      </header>
      <ProductGrid category={category} />
    </div>
  );
}
