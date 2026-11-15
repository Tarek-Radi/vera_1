import { it, expect, vi } from 'vitest';
vi.mock('postgres', () => ({default: () => {throw new Error('Database client must never initialize');}}));
import { checkoutWithoutDatabase } from '../lib/orders/whatsapp-only';
import { products } from '../lib/catalog';
import { testCustomer } from './fixtures';
import { normalizeWhatsAppNumber } from '../lib/whatsapp';
const items = products.slice(0,2).map(p => ({sku:p.sku,size:p.sizes[0],quantity:2}));
const input = {items,customer:testCustomer,idempotencyKey:'0a127446-715a-4d38-a812-625cbb3d5800'};
it('prepares all Arabic items without credentials, persistence or reference',()=>{
 delete process.env.DATABASE_URL; delete process.env.COUPON_HMAC_SECRET;
 const result=checkoutWithoutDatabase(input);
 expect(result.saved).toBe(false); expect(result).not.toHaveProperty('orderNumber');
 expect(result.totalBeforeShipping).toBe(products.slice(0,2).reduce((n,p)=>n+p.priceMinor*2,0));
 const url=new URL(result.whatsappUrl);expect(url.pathname).toBe('/201009785343');
 expect(url.searchParams.get('text')).toBe(result.invoice);
 for(const p of products.slice(0,2))expect(result.invoice).toContain(p.name);
 expect(result.invoice).toContain(testCustomer.address);expect(result.invoice).not.toContain('رقم الطلب');
 expect(checkoutWithoutDatabase(input)).toEqual(result);
});
it('rejects coupons, unpriced custom products, totals and invalid fields',()=>{
 for(const bad of [{...input,customer:{...testCustomer,name:''}},{...input,items:[{...items[0],coupon:'VALID20CODE'}]},{...input,total:1},{...input,items:[{...items[0],size:'INVALID'}]},{...input,items:[{...items[0],customization:{placement:'front',charge:1}}]}]) expect(()=>checkoutWithoutDatabase(bad)).toThrow();
 expect(()=>normalizeWhatsAppNumber('')).toThrow();
});
