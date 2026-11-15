// Public build-time setting: rebuild when changing modes. Defaults to temporary WhatsApp-only mode.
const mode = process.env.NEXT_PUBLIC_CHECKOUT_MODE || "whatsapp";
if (!["whatsapp", "database"].includes(mode))
  throw new Error("NEXT_PUBLIC_CHECKOUT_MODE must be whatsapp or database.");
export const databaseFreeCheckout = mode === "whatsapp";
