import { expect, it } from "vitest";
import { products, categories } from "../lib/catalog";
import { validateLines, totals, bundleOffer } from "../lib/orders/validation";
it("uses sale prices for all hoodies and five pants through checkout", () => {
  const pants = products.filter(p => p.category === "pants");
  expect(pants).toHaveLength(5);
  expect(categories.some(c => c.slug === "sweatpants")).toBe(false);
  const affected = products.filter(p => p.available && ["pants", "hoodies"].includes(p.category));
  for (const p of affected) {
    expect(p.priceMinor).toBe(60000);
    expect(p.compareAtMinor).toBe(65000);
    expect(p.images.length).toBeGreaterThan(0);
  }
  const lines = validateLines(affected.map(p => ({ sku:p.sku, size:p.sizes[0], quantity:2, ...(p.slug === "senior-hoodie" ? {printName:"Test"} : {}) })));
  expect(lines.every(l => l.unitPrice === 60000 && l.lineTotal === 120000)).toBe(true);
  expect(totals(lines).totalBeforeShipping).toBe(affected.length * 120000 - Math.min(pants.length, affected.length - pants.length) * 2 * 20000);
});

it.each([[1,0,600],[1,1,1000],[1,2,1600],[2,2,2000]])("White Hoodie bundle %s/%s",(hoodies,pants)=>{
 const matches=products.filter(p=>p.name === "White Hoodie");
 expect(matches).toHaveLength(1);
 const white=matches[0], pant=products.find(p=>p.category === "pants")!;
 expect(white.category).toBe("hoodies");
 const items=[{sku:white.sku,size:white.sizes[0],quantity:hoodies},{sku:pant.sku,size:pant.sizes[0],quantity:pants}].filter(x=>x.quantity);
 expect(white.available).toBe(false);
 expect(()=>validateLines(items)).toThrow("no longer available");
 expect(bundleOffer(items).bundleCount).toBe(0);
});
