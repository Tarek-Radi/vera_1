import { z } from "zod";
import { productBySku } from "../catalog";
export const printNameSchema = z.string().trim().min(1, "Enter the name to print on your hoodie.").max(20, "Use at most 20 characters.").regex(/^[^\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]+$/, "Use a name without control characters.");
export const isSenior = (sku: string) => productBySku(sku)?.slug === "senior-hoodie";
export function personalizationNotes(items: {sku:string;size:string;quantity:number;printName?:string}[]) {
 return items.filter(i=>isSenior(i.sku) && i.printName).map(i=>`Personalization – Senior Hoodie (${i.sku}, size ${i.size}, qty ${i.quantity})\nName to print: ${i.printName}`).join("\n\n");
}
