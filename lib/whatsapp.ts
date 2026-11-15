export function normalizeWhatsAppNumber(value: string) {
  if (!/^\+?[\d\s().-]+$/.test(value.trim()))
    throw new Error("Invalid WhatsApp destination.");
  const number = value.replace(/[+\s().-]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(number))
    throw new Error(
      "WhatsApp requires country code and digits, without a leading zero.",
    );
  return number;
}
export function whatsappUrl(number: string, message?: string) {
  return `https://wa.me/${normalizeWhatsAppNumber(number)}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
// Conservative app threshold, not a claimed WhatsApp maximum. Never truncate.
export const MAX_WHATSAPP_URL_LENGTH = 8000;
export function whatsappHandoff(number: string, message: string) {
  const url = whatsappUrl(number, message);
  const requiresCopy = url.length > MAX_WHATSAPP_URL_LENGTH;
  return {
    whatsappUrl: requiresCopy ? whatsappUrl(number) : url,
    requiresCopy,
  };
}
