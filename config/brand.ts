import { normalizeWhatsAppNumber, whatsappUrl } from "../lib/whatsapp";
// Configure the owner destination here, including country code.
const storeWhatsApp = normalizeWhatsAppNumber("201009785343");
export const brand = {
  name: "VERA",
  country: "Egypt",
  currency: "EGP",
  whatsapp: storeWhatsApp,
  whatsappDisplay: `+${storeWhatsApp}`,
  instagram: "https://www.instagram.com/vera.egbrand/",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://vera1-sigma.vercel.app",
  headline: "WEAR YOUR IDENTITY",
  tagline: "Discover your style with VERA.",
  story:
    "Style is personal. The pieces you reach for, the colours you connect with, the way you make them your own. VERA is an invitation to express yourself, every day.",
  reservationMinutes: 30,
};
export const whatsappLink = whatsappUrl(brand.whatsapp);
export const navLinks = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["Hoodies", "/collections/hoodies"],
  ["Hijabs", "/collections/hijabs"],
  ["Pants", "/collections/pants"],
  ["Custom design", "/custom-design"],
  ["About VERA", "/about"],
  ["Contact", "/contact"],
];
