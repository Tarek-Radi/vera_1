import { databaseFreeCheckout } from "../../../config/checkout";
import { checkoutWithoutDatabase } from "../../../lib/orders/whatsapp-only";
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
    if (databaseFreeCheckout)
      return NextResponse.json(
        checkoutWithoutDatabase(await requestBody(request)),
        { headers: { "Cache-Control": "no-store" } },
      );
    await rateLimit(request, "checkout", 10);
    const { items, idempotencyKey, customer } = checkoutSchema.parse(
      await requestBody(request),
    );
    return NextResponse.json(await checkout(items, idempotencyKey, customer), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
});
