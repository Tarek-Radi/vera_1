import { it, expect, vi } from "vitest";
import { requestBody } from "../lib/http";
import { checkoutWithoutDatabase } from "../lib/orders/whatsapp-only";
import { products } from "../lib/catalog";
import { testCustomer } from "./fixtures";
const req=(origin:string,host="vera.example")=>new Request("https://internal.example/api/quote",{method:"POST",headers:{origin,host,"content-type":"application/json"},body:"{}"});
it("accepts the destination host behind a proxy but rejects foreign origins",async()=>{
 vi.stubEnv("SITE_URL","https://configured.example");
 try {
 await expect(requestBody(req("https://vera.example"))).resolves.toEqual({});
 await expect(requestBody(req("https://evil.example"))).rejects.toThrow("verify this page");
 } finally { vi.unstubAllEnvs(); }
});
it.each([[1,1,1000],[2,2,2000],[1,2,1600],[2,1,1600],[3,2,2600]])("generates validated bundle WhatsApp order %s/%s",(h,p,total)=>{
 const items=["hoodies","pants"].map((category,i)=>{const product=products.find(p=>p.category===category)!;return {sku:product.sku,size:product.sizes[0],quantity:i?p:h};});
 const input={items,customer:testCustomer,idempotencyKey:crypto.randomUUID()};
 const result=checkoutWithoutDatabase(input);
 expect(result.totalBeforeShipping).toBe(total*100);
 expect(result.invoice).toContain("Hoodie + Pants Bundle Discount");
 expect(new URL(result.whatsappUrl).searchParams.get("text")).toBe(result.invoice);
 expect(()=>checkoutWithoutDatabase({...input,total:1})).toThrow();
 expect(()=>checkoutWithoutDatabase({...input,items:[{...items[0],size:"INVALID"}]})).toThrow();
});
