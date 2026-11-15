import catalog from "../generated/catalog.json";
export type Product = {
  identity: string;
  stableId: string;
  sku: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  color: string;
  priceMinor: number;
  compareAtMinor: number | null;
  sizes: string[];
  available: boolean;
  featured: boolean;
  family: string | null;
  description: string;
  images: string[];
  firstSeenAt: string;
};
export const products = catalog.products as Product[];
export const categories = catalog.categories;
export const promotionalImage = catalog.promotions[0] || "/images/hoodies.webp";
export const productBySku = (sku: string) =>
  products.find((p) => p.sku === sku);
export const money = (minor: number) =>
  `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(minor / 100)} EGP`;
export const colorHex: Record<string, string> = {
  Black: "#1c2026",
  Burgundy: "#662535",
  Gray: "#929ba3",
  White: "#f0eee8",
  Navy: "#172b4b",
  Blue: "#8fbde3",
};
