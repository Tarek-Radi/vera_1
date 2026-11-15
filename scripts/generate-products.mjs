import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const supported = /\.(jpe?g|png|webp|avif)$/i;
const title = (s) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export function parseProduct(relative, config) {
  if (!supported.test(relative)) return null;
  const base = path.posix.basename(relative).replace(supported, "");
  const match = base.match(
    /^([a-z0-9][a-z0-9 -]*)_([a-z]+)_(\d+(?:\.\d{1,2})?)$/i,
  );
  if (!match) return null;
  const [, color, kind, price] = match;
  const category = config.categories[kind.toLowerCase()];
  if (!category) return null;
  const [whole, decimal = ""] = price.split(".");
  const priceMinor = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (
    !Number.isSafeInteger(priceMinor) ||
    priceMinor <= 0 ||
    priceMinor > 100000000
  )
    return null;
  const directory = path.posix.dirname(relative);
  const identity = `${directory === "." ? "" : `${directory}/`}${color.toLowerCase().replace(/ /g, "-")}_${kind.toLowerCase()}`;
  const meta = config.products[identity] || {};
  const stableId = meta.id || identity;
  const hash = createHash("sha256")
    .update(stableId)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
  const sku =
    meta.sku ||
    `VER-${category.skuPrefix}-${color.slice(0, 3).toUpperCase()}-${hash}`;
  if (!/^[A-Z0-9-]{4,64}$/.test(sku))
    throw new Error(`Invalid SKU for ${identity}`);
  const pricing = config.pricing[category.slug] || {};
  const approved =
    meta.referencePriceApproved ?? pricing.referencePriceApproved;
  const suggested =
    meta.compareAtPrice ??
    priceMinor / 100 + (pricing.suggestedCompareAtOffset || 0);
  const compareAtMinor =
    approved === true &&
    Number.isFinite(suggested) &&
    suggested * 100 > priceMinor
      ? Math.round(suggested * 100)
      : null;
  const sizes = meta.sizes || category.sizes;
  if (
    !Array.isArray(sizes) ||
    !sizes.length ||
    sizes.some((s) => typeof s !== "string" || !s.trim())
  )
    throw new Error(`Invalid sizes for ${identity}`);
  return {
    identity,
    stableId,
    sku,
    slug:
      meta.slug ||
      `${title(color).toLowerCase().replace(/ /g, "-")}-${kind.toLowerCase()}-${hash.toLowerCase()}`,
    name: meta.name || `${title(color)} ${title(kind)}`,
    category: category.slug,
    categoryLabel: category.label,
    color: title(color),
    priceMinor,
    compareAtMinor,
    sizes,
    available: meta.available !== false,
    featured: meta.featured === true,
    family: meta.family || null,
    description: meta.description || category.description,
    gallery: meta.images || [],
    firstSeenAt: "",
    images: [],
  };
}
async function walk(root, relative = "") {
  const entries = await fs
    .readdir(path.join(root, relative), { withFileTypes: true })
    .catch((e) => {
      if (e.code === "ENOENT") return [];
      throw e;
    });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) continue;
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(root, name)));
    else if (supported.test(name)) files.push(name);
  }
  return files;
}
export async function generateCatalog(root, now = new Date().toISOString()) {
  const config = JSON.parse(
    await fs.readFile(path.join(root, "config/catalog.json"), "utf8"),
  );
  const registryPath = path.join(root, "config/catalog-registry.json");
  const registry = await fs
    .readFile(registryPath, "utf8")
    .then(JSON.parse)
    .catch((e) => {
      if (e.code === "ENOENT") return {};
      throw e;
    });
  const collectionRoot = path.resolve(root, "collection");
  const out = path.join(root, "public/catalog");
  await fs.mkdir(out, { recursive: true });
  const copyImage = async (relative) => {
    const source = path.resolve(collectionRoot, relative);
    if (
      !source.startsWith(collectionRoot + path.sep) ||
      !supported.test(source)
    )
      throw new Error("Unsafe image path");
    const real = await fs.realpath(source);
    if (!real.startsWith(collectionRoot + path.sep))
      throw new Error("Image escapes collection folder");
    const bytes = await fs.readFile(source);
    const name =
      createHash("sha256").update(bytes).digest("hex").slice(0, 24) +
      path.extname(source).toLowerCase();
    await fs.writeFile(path.join(out, name), bytes);
    return `/catalog/${name}`;
  };
  const files = await walk(collectionRoot);
  const galleryFiles = new Set(
    Object.values(config.products).flatMap((p) => p.images || []),
  );
  const products = [],
    promotions = [],
    warnings = [],
    seen = new Set(),
    skus = new Set(),
    slugs = new Set();
  for (const file of files) {
    if (config.promotionalImages.includes(file)) {
      promotions.push(await copyImage(file));
      continue;
    }
    if (galleryFiles.has(file)) continue;
    const product = parseProduct(file, config);
    if (!product) {
      warnings.push(`Skipped ${file}: expected color_productType_price image.`);
      continue;
    }
    if (seen.has(product.stableId))
      throw new Error(
        `Duplicate product identity: ${product.identity}. Use nested model folders and metadata.`,
      );
    const old = registry[product.stableId];
    const meta = config.products[product.identity] || {};
    product.sku = meta.sku || old?.sku || product.sku;
    product.slug = meta.slug || old?.slug || product.slug;
    if (
      !/^[a-z0-9-]+$/.test(product.slug) ||
      skus.has(product.sku) ||
      slugs.has(product.slug)
    )
      throw new Error(`Duplicate or invalid SKU/slug: ${product.identity}`);
    product.firstSeenAt = old?.firstSeenAt || now;
    registry[product.stableId] = {
      sku: product.sku,
      slug: product.slug,
      firstSeenAt: product.firstSeenAt,
    };
    product.images = await Promise.all(
      [file, ...product.gallery].map(copyImage),
    );
    delete product.gallery;
    seen.add(product.stableId);
    skus.add(product.sku);
    slugs.add(product.slug);
    products.push(product);
  }
  await fs.mkdir(path.join(root, "generated"), { recursive: true });
  const catalog = {
    products,
    promotions,
    categories: Object.values(config.categories).map(
      ({ slug, label, sizes }) => ({ slug, label, sizes }),
    ),
  };
  await fs.writeFile(
    path.join(root, "generated/catalog.json"),
    JSON.stringify(catalog, null, 2) + "\n",
  );
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2) + "\n");
  return { ...catalog, warnings };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const catalog = await generateCatalog(process.cwd());
  catalog.warnings.forEach((w) => console.warn(w));
  console.log(
    `Catalog: ${catalog.products.length} products, ${catalog.promotions.length} promotional images.`,
  );
}
