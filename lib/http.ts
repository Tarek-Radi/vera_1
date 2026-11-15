import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db, databaseConfigured, withDatabaseRequest } from "./db/client";
import { StoreError } from "./orders/validation";
export async function requestBody(request: Request) {
  const origin = request.headers.get("origin");
  // SITE_URL is runtime configuration; NEXT_PUBLIC_* is frozen by Next at build time.
  const expected = new URL(
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.url,
  ).origin;
  if (origin && origin !== expected && origin !== new URL(request.url).origin)
    throw new StoreError(
      "Please submit this request from the VERA website.",
      403,
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new StoreError("Expected a JSON request.", 415);
  if (Number(request.headers.get("content-length") || 0) > 16000)
    throw new StoreError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new StoreError("Request body is missing.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16000) {
      await reader.cancel();
      throw new StoreError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new StoreError("Please check the request and try again.");
  }
}
export async function rateLimit(request: Request, scope: string, limit = 30) {
  if (!databaseConfigured()) return; // Coupon/order paths fail closed when persistence is absent.
  // These headers are supplied by the named host, never arbitrary x-forwarded-for.
  const ip =
    process.env.VERA_RUNTIME === "cloudflare"
      ? request.headers.get("cf-connecting-ip") || "unknown"
      : process.env.VERCEL
        ? request.headers
            .get("x-vercel-forwarded-for")
            ?.split(",")[0]
            ?.trim() || "unknown"
        : "local";
  const key = createHash("sha256").update(`${scope}:${ip}`).digest("hex");
  const [row] =
    await db()`insert into rate_limits (key, hits, resets_at) values (${key}, 1, now() + interval '1 minute') on conflict (key) do update set hits = case when rate_limits.resets_at <= now() then 1 else rate_limits.hits + 1 end, resets_at = case when rate_limits.resets_at <= now() then now() + interval '1 minute' else rate_limits.resets_at end returning hits`;
  if (row.hits > limit)
    throw new StoreError(
      "Please wait a minute before trying again.",
      429,
      "RATE_LIMITED",
    );
}
export function storeRoute(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await withDatabaseRequest(() => handler(request));
    } catch (error) {
      return errorResponse(error);
    }
  };
}
export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: "Please check your items, sizes and coupon codes.",
        code: "VALIDATION",
      },
      { status: 400 },
    );
  if (error instanceof StoreError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      {
        status: error.status,
        headers: error.status === 429 ? { "Retry-After": "60" } : {},
      },
    );
  console.error(
    "Store operation failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    {
      error:
        "We could not complete that request. Please try again or contact VERA.",
      code: "UNAVAILABLE",
    },
    { status: 503 },
  );
}
