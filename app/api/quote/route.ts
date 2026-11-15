import { databaseFreeCheckout } from "../../../config/checkout";
import { quoteWithoutDatabase } from "../../../lib/orders/whatsapp-only";
import { NextResponse } from "next/server";
import { cartSchema } from "../../../lib/orders/validation";
import { quote } from "../../../lib/orders/service";
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
        quoteWithoutDatabase(await requestBody(request)),
        { headers: { "Cache-Control": "no-store" } },
      );
    await rateLimit(request, "quote", 60);
    const { items } = cartSchema.parse(await requestBody(request));
    return NextResponse.json(await quote(items), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
});
