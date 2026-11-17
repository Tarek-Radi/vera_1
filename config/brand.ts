import { normalizeWhatsAppNumber, whatsappUrl } from "../lib/whatsapp";
// Configure the owner destination here, including country code.
const storeWhatsApp = "201009785343";
// Let checkout / custom requests show actionable errors if the destination is
// removed or mistyped, instead of crashing every page during module loading.
const configuredWhatsApp = (() => {
  try {
    return normalizeWhatsAppNumber(storeWhatsApp);
  } catch {
    return "";
  }
})();
export const brand = {
  name: "VERA",
  country: "Egypt",
  currency: "EGP",
  whatsapp: configuredWhatsApp,
  whatsappDisplay: configuredWhatsApp
    ? `+${configuredWhatsApp}`
    : "WhatsApp currently unavailable",
  instagram: "https://www.instagram.com/vera.egbrand/",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://vera1-sigma.vercel.app",
  headline: "WEAR YOUR IDENTITY",
  tagline: "Discover your style with VERA.",
  story:
    "Style is personal. The pieces you reach for, the colours you connect with, the way you make them your own. VERA is an invitation to express yourself, every day.",
  reservationMinutes: 30,
};
export const whatsappLink = brand.whatsapp
  ? whatsappUrl(brand.whatsapp)
  : "/contact";
export const navLinks = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["Hoodies", "/collections/hoodies"],
  ["Scarves", "/collections/hijabs"],
  ["Pants", "/collections/pants"],
  ["Custom design", "/custom-design"],
  ["About VERA", "/about"],
  ["Contact", "/contact"],
];
