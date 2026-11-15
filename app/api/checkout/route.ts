import { NextResponse } from "next/server";
import { checkoutSchema } from "../../../lib/orders/validation";
import { checkout } from "../../../lib/orders/service";
import {
  requestBody,
  rateLimit,
  errorResponse,
  storeRoute,
} from "../../../lib/http";
export const POST = storeRoute(async function POST(request: Request) {
  try {
    await rateLimit(request, "checkout", 10);
    const parsed = checkoutSchema.safeParse(
      await requestBody(request),
    );
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check your checkout details.", code: "VALIDATION" }, { status: 400 });
    const { items, idempotencyKey, customer } = parsed.data;
    return NextResponse.json(await checkout(items, idempotencyKey, customer), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
});
