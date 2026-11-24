import { it, expect } from "vitest";
import { existsSync } from "node:fs";
import { products } from "../lib/catalog";
import { validateLines } from "../lib/orders/validation";
import { checkoutWithoutDatabase } from "../lib/orders/whatsapp-only";
import { testCustomer } from "./fixtures";
it("registers one Senior Hoodie with real assets and confirmed availability",()=>{
 const matches=products.filter(p=>p.family === "senior-graduation");
 expect(matches).toHaveLength(1);
 const p=matches[0];
 expect(p.name).toBe("Senior Hoodie");
 expect(p.images).toHaveLength(4);
 for(const image of p.images) expect(existsSync(`public${image}`)).toBe(true);
 const items=[{sku:p.sku,size:p.sizes[0],quantity:1,printName:"Tarek"}];
 expect(validateLines(items)[0].unitPrice).toBe(60000);
 expect(p.compareAtMinor).toBe(65000);
 const result=checkoutWithoutDatabase({items,customer:testCustomer,idempotencyKey:crypto.randomUUID()});
 expect(result.totalBeforeShipping).toBe(60000);
 expect(result.invoice).toContain("Senior Hoodie");
 expect(result.invoice).toContain(p.sku);
 expect(new URL(result.whatsappUrl).searchParams.get("text")).toBe(result.invoice);
});

it("keeps separate printed names and manual notes in validated checkout",()=>{
 const p=products.find(p=>p.slug === "senior-hoodie")!;
 const items=[" Tarek ","Mona"].map(printName=>({sku:p.sku,size:"M",quantity:1,printName}));
 const input={items,customer:{...testCustomer,notes:"Call before delivery"},idempotencyKey:crypto.randomUUID()};
 const result=checkoutWithoutDatabase(input);
 expect(result.items).toHaveLength(2);
 expect(result.items[0].printName).toBe("Tarek");
 for(const text of ["Call before delivery","Name to print: Tarek","Name to print: Mona"]) expect(result.invoice).toContain(text);
 for(const printName of [undefined," ","x".repeat(21),"bad\nname"]) expect(()=>checkoutWithoutDatabase({...input,items:[{...items[0],printName}]})).toThrow();
 const other=products.find(p=>p.available && p.category === "pants")!;
 expect(()=>validateLines([{sku:other.sku,size:"M",quantity:1,printName:"Tarek"}])).toThrow();
});
