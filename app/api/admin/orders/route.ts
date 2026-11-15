import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../../../../lib/auth/server";
import {
  requestBody,
  rateLimit,
  errorResponse,
  storeRoute,
} from "../../../../lib/http";
import { listOrders, changeOrder } from "../../../../lib/orders/service";
export const GET = storeRoute(async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(
      { orders: await listOrders() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
});
export const POST = storeRoute(async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    await rateLimit(request, "admin", 60);
    const { id, action } = z
      .object({
        id: z.uuid(),
        action: z.enum(["CONFIRMED", "CANCELLED", "FULFILLED"]),
      })
      .strict()
      .parse(await requestBody(request));
    return NextResponse.json(await changeOrder(id, action, user.id));
  } catch (e) {
    return errorResponse(e);
  }
});
