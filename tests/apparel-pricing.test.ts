import { expect, it } from "vitest";
import { products, categories } from "../lib/catalog";
import { validateLines, totals } from "../lib/orders/validation";
it("uses sale prices for all hoodies and five pants through checkout", () => {
  const pants = products.filter(p => p.category === "pants");
  expect(pants).toHaveLength(5);
  expect(categories.some(c => c.slug === "sweatpants")).toBe(false);
  const affected = products.filter(p => ["pants", "hoodies"].includes(p.category));
  for (const p of affected) {
    expect(p.priceMinor).toBe(60000);
    expect(p.compareAtMinor).toBe(65000);
    expect(p.images.length).toBeGreaterThan(0);
  }
  const lines = validateLines(affected.map(p => ({ sku:p.sku, size:p.sizes[0], quantity:2 })));
  expect(lines.every(l => l.unitPrice === 60000 && l.lineTotal === 120000)).toBe(true);
  expect(totals(lines).totalBeforeShipping).toBe(affected.length * 120000 - 120000);
});
