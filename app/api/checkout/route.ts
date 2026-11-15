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
    const { items, idempotencyKey } = checkoutSchema.parse(
      await requestBody(request),
    );
    return NextResponse.json(await checkout(items, idempotencyKey), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
});
