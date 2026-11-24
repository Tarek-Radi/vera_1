import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { type Product, money, colorHex } from "../../lib/catalog";
export function Price({ product }: { product: Product }) {
  return (
    <span className="price">
      {product.compareAtMinor ? (
        <del>{money(product.compareAtMinor)}</del>
      ) : null}
      <strong>{money(product.priceMinor)}</strong>
    </span>
  );
}
export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-image">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw"
        />
        <span className={`product-tag${product.available ? "" : " sold-out-tag"}`}>
          {product.available ? (product.compareAtMinor ? "SALE" : product.categoryLabel) : (product.availabilityLabel || "SOLD OUT")}
        </span>
        <span className="quick-view">
          {product.available ? <>Choose your size <Plus size={17} /></> : (product.availabilityLabel || "Sold Out")}
        </span>
      </Link>
      <div className="product-card-meta">
        <div>
          <Link href={`/products/${product.slug}`} className="product-name">
            {product.name}
          </Link>
          <span className="product-color">
            <i style={{ background: colorHex[product.color] || "#a9acb0" }} />
            {product.color}
          </span>
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="product-arrow"
          aria-label={`View ${product.name}`}
        >
          <ArrowUpRight size={19} />
        </Link>
      </div>
      <Price product={product} />
    </article>
  );
}
