// The destination is configured in config/brand.ts. No browser/Node dependencies.
export function normalizeWhatsAppNumber(value: string): string {
  const input = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(input))
    throw new Error("Configure WhatsApp with a country code and digits only.");
  const number = input.replace(/[+\s().-]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(number))
    throw new Error("WhatsApp requires an international number, without a leading zero.");
  return number;
}
// Conservative application limit, not a claimed WhatsApp protocol maximum.
// Encoded Arabic text expands considerably. Never truncate the message.
export const MAX_WHATSAPP_URL_LENGTH = 8000;
export function whatsappUrl(number: string, message?: string): string {
  const chat = `https://wa.me/${normalizeWhatsAppNumber(number)}`;
  return message ? `${chat}?text=${encodeURIComponent(message)}` : chat;
}
export function whatsappHandoff(number: string, message: string) {
  const prefilled = whatsappUrl(number, message);
  const requiresCopy = prefilled.length > MAX_WHATSAPP_URL_LENGTH;
  return { whatsappUrl: requiresCopy ? whatsappUrl(number) : prefilled, requiresCopy };
}
