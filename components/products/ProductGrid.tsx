"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { categories, products } from "../../lib/catalog";
import { ProductCard } from "./ProductCard";
export function ProductGrid({
  category,
  initialSearch = "",
}: {
  category?: string;
  initialSearch?: string;
}) {
  const [query, setQuery] = useState(initialSearch),
    [selectedCategory, setCategory] = useState(category || ""),
    [color, setColor] = useState(""),
    [size, setSize] = useState(""),
    [maxPrice, setMaxPrice] = useState(""),
    [available, setAvailable] = useState(false),
    [sort, setSort] = useState("newest"),
    [filters, setFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (!selectedCategory || p.category === selectedCategory) &&
            (!color || p.color === color) &&
            (!size || p.sizes.includes(size)) &&
            (!available || p.available) &&
            (!maxPrice || p.priceMinor <= Number(maxPrice) * 100) &&
            (!minPrice || p.priceMinor >= Number(minPrice) * 100) &&
            query
              .toLowerCase()
              .trim()
              .split(/\s+/)
              .every((word) =>
                `${p.name} ${p.color} ${p.sku} ${p.categoryLabel}`
                  .toLowerCase()
                  .includes(word),
              ),
        )
        .sort((a, b) =>
          sort === "price-up"
            ? a.priceMinor - b.priceMinor
            : sort === "price-down"
              ? b.priceMinor - a.priceMinor
              : sort === "name"
                ? a.name.localeCompare(b.name)
                : b.firstSeenAt.localeCompare(a.firstSeenAt) ||
                  a.name.localeCompare(b.name),
        ),
    [selectedCategory, color, size, available, minPrice, maxPrice, query, sort],
  );
  function reset() {
    setQuery("");
    setCategory(category || "");
    setColor("");
    setSize("");
    setMaxPrice("");
    setMinPrice("");
    setAvailable(false);
  }
  return (
    <>
      <div className="catalog-toolbar">
        <div className="catalog-search">
          <Search size={17} />
          <input
            aria-label="Search the collection"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find your piece…"
          />
        </div>
        <button
          className="filter-toggle"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
        <span className="result-count" aria-live="polite">
          {filtered.length} pieces
        </span>
        <label className="sort-label">
          <span className="sr-only">Sort products</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="price-up">Price: low to high</option>
            <option value="price-down">Price: high to low</option>
            <option value="name">Name: A–Z</option>
          </select>
        </label>
      </div>
      {filters && (
        <div className="filters">
          <label>
            Collection
            <select
              value={selectedCategory}
              onChange={(e) => setCategory(e.target.value)}
              disabled={Boolean(category)}
            >
              <option value="">All collections</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Colour
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="">All colours</option>
              {[...new Set(products.map((p) => p.color))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Size
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="">All sizes</option>
              {[...new Set(products.flatMap((p) => p.sizes))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Min price · EGP
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Any"
            />
          </label>
          <label>
            Max price · EGP
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any"
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />{" "}
            Available only
          </label>
          <button onClick={reset} className="text-link">
            Reset <X size={14} />
          </button>
        </div>
      )}
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard product={p} key={p.sku} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="eyebrow">ROOM FOR SOMETHING NEW</span>
          <h2>
            {category === "pants" &&
            !products.some((p) => p.category === "pants")
              ? "Pants. Coming soon."
              : "No pieces found."}
          </h2>
          <p>
            {category === "pants"
              ? "A new addition to your everyday wardrobe is on its way. Explore our current collection in the meantime."
              : "Try another colour, size or search to find your VERA."}
          </p>
          <button className="button secondary" onClick={reset}>
            Reset filters
          </button>
          <Link href="/shop" className="text-link">
            Explore all pieces
          </Link>
        </div>
      )}
    </>
  );
}
