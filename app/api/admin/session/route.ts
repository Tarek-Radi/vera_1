import { NextResponse } from "next/server";
import { z } from "zod";
import { authClient, requireAdmin } from "../../../../lib/auth/server";
import {
  requestBody,
  rateLimit,
  errorResponse,
  storeRoute,
} from "../../../../lib/http";
import { StoreError } from "../../../../lib/orders/validation";
export const POST = storeRoute(async function POST(request: Request) {
  try {
    await rateLimit(request, "login", 6);
    const { email, password } = z
      .object({ email: z.email(), password: z.string().min(1).max(256) })
      .strict()
      .parse(await requestBody(request));
    const auth = await authClient();
    const { error } = await auth.auth.signInWithPassword({ email, password });
    if (error)
      throw new StoreError(
        "Unable to sign in. Check your owner credentials.",
        401,
      );
    try {
      await requireAdmin();
    } catch (e) {
      await auth.auth.signOut();
      throw e;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
});
export const DELETE = storeRoute(async function DELETE(request: Request) {
  try {
    await requestBody(request);
    const auth = await authClient();
    await auth.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
});
