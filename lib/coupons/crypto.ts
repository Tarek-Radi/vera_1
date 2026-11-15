import { createHmac } from "node:crypto";
export function couponVerifier(code: string) {
  const secret = process.env.COUPON_HMAC_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("COUPON_HMAC_SECRET must contain at least 32 characters.");
  return createHmac("sha256", secret)
    .update(code.trim().toUpperCase())
    .digest("hex");
}
