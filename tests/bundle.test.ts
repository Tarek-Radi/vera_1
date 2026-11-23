import { expect, it } from "vitest";
import { products } from "../lib/catalog";
import { validateLines, totals } from "../lib/orders/validation";
const h = products.find(p=>p.category === "hoodies")!;
const p = products.find(p=>p.category === "pants")!;
it.each([[1,1,1000],[2,2,2000],[1,2,1600],[2,1,1600],[3,2,2600],[3,3,3000],[0,2,1200],[2,0,1200]])("prices %s hoodies and %s pants",(hq,pq,total)=>{
 const cart = [{sku:h.sku,size:h.sizes[0],quantity:hq},{sku:p.sku,size:p.sizes[0],quantity:pq}].filter(x=>x.quantity);
 expect(totals(validateLines(JSON.parse(JSON.stringify(cart))))).toMatchObject({totalBeforeShipping:total*100,bundleCount:Math.min(hq,pq)});
});
it("rejects coupon stacking",()=>expect(()=>validateLines([{sku:h.sku,size:h.sizes[0],quantity:1,coupon:"TESTCODE"},{sku:p.sku,size:p.sizes[0],quantity:1}])).toThrow("cannot be combined"));

it("handles mixed sizes, scarves, removal and quantity changes",()=>{
 const scarf=products.find(p=>p.category === "hijabs")!;
 const lines=[{sku:h.sku,size:h.sizes[0],quantity:1},{sku:h.sku,size:h.sizes[1],quantity:1},{sku:p.sku,size:p.sizes[0],quantity:2},{sku:scarf.sku,size:scarf.sizes[0],quantity:1}];
 expect(totals(validateLines(lines)).totalBeforeShipping).toBe(200000+scarf.priceMinor);
 expect(totals(validateLines(lines.filter(x=>x.sku!==p.sku))).bundleCount).toBe(0);
 lines[2].quantity=1;
 expect(totals(validateLines(lines)).totalBeforeShipping).toBe(160000+scarf.priceMinor);
});
