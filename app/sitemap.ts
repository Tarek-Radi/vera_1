import type { MetadataRoute } from "next";
import { brand } from "../config/brand";
import { products, categories } from "../lib/catalog";
import { informationPages } from "../config/content";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/shop",
    "/custom-design",
    "/contact",
    "/faq",
    "/size-guide",
    ...Object.keys(informationPages).map((x) => `/${x}`),
    ...categories.map((c) => `/collections/${c.slug}`),
    ...products.map((p) => `/products/${p.slug}`),
  ].map((path) => ({
    url: `${brand.siteUrl}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
