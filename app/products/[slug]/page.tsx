import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "../../../lib/catalog";
import { ProductDetail } from "../../../components/products/ProductDetail";
import { ProductCard } from "../../../components/products/ProductCard";
import { brand } from "../../../config/brand";
// The catalog is bundled at build time; new products require a rebuild.
export const dynamicParams = false;
export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = products.find((p) => p.slug === slug);
  return {
    title: p?.name || "Product",
    description: p?.description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: p
      ? {
          title: p.name,
          description: p.description,
          images: p.images.map((url) => ({ url, alt: p.name })),
        }
      : undefined,
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = products.find((p) => p.slug === slug);
  if (!p) notFound();
  const variants = p.family
    ? products.filter((x) => x.family === p.family)
    : [];
  const related = products
    .filter((x) => x.sku !== p.sku && x.category === p.category)
    .slice(0, 4);
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    image: p.images.map((src) => new URL(src, brand.siteUrl).href),
    description: p.description,
    color: p.color,
    brand: { "@type": "Brand", name: "VERA" },
    offers: {
      "@type": "Offer",
      url: `${brand.siteUrl}/products/${p.slug}`,
      priceCurrency: "EGP",
      price: (p.priceMinor / 100).toFixed(2),
      availability: p.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  return (
    <div className="page-shell product-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        <span>/</span>
        <Link href={`/collections/${p.category}`}>{p.categoryLabel}</Link>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
      <ProductDetail key={p.sku} product={p} variants={variants} />
      {related.length > 0 && (
        <section className="related">
          <div className="section-heading">
            <div>
              <p className="eyebrow">KEEP EXPLORING</p>
              <h2>
                A little more you<span>.</span>
              </h2>
            </div>
          </div>
          <div className="product-grid">
            {related.map((x) => (
              <ProductCard key={x.sku} product={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
