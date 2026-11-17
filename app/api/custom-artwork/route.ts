import { z } from "zod";
import {
  uploadSchema,
  saveArtwork,
  validateImage,
} from "../../../lib/custom/drive";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const fail = (error: string, status = 400) =>
    Response.json({ error }, { status, headers });
  try {
    const endpoint = process.env.ARTWORK_SCRIPT_URL,
      secret = process.env.ARTWORK_SCRIPT_SECRET;
    const browserOrigin = new URL(request.url);
    browserOrigin.host = request.headers.get("host") || browserOrigin.host;
    const expected = new URL(process.env.SITE_URL || browserOrigin.origin)
      .origin;
    if (!endpoint || !secret)
      return fail(
        "Artwork uploads need ARTWORK_SCRIPT_URL and ARTWORK_SCRIPT_SECRET configured on the server.",
        503,
      );
    if (
      !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(
        endpoint,
      ) ||
      secret.length < 32
    )
      return fail(
        "Artwork upload configuration is invalid. Contact VERA.",
        503,
      );
    if (request.headers.get("origin") !== expected)
      return fail("Submit artwork from the VERA website.", 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      return fail("Expected JSON.", 415);
    const configured = Number(process.env.ARTWORK_MAX_BYTES || 1048576);
    const maxBytes = Math.min(
      2 * 1024 * 1024,
      Math.max(1024, Number.isFinite(configured) ? configured : 1048576),
    );
    const limit = Math.ceil((2 * 1024 * 1024 * 4) / 3) + 8192;
    if (Number(request.headers.get("content-length") || 0) > limit)
      return fail("Artwork exceeds the upload size limit.", 413);
    const reader = request.body?.getReader();
    if (!reader) return fail("Missing artwork.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > limit) {
        await reader.cancel();
        return fail("Artwork exceeds the upload size limit.", 413);
      }
      chunks.push(part.value);
    }
    const parsed = z
      .object({
        reference: uploadSchema.shape.reference,
        artwork: z
          .array(uploadSchema.omit({ reference: true }))
          .min(1)
          .max(1)
          .refine(
            (a) =>
              new Set(a.map((x) => x.position)).size === a.length &&
              new Set(a.map((x) => x.token)).size === a.length,
          ),
      })
      .strict()
      .safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success)
      return fail("Check artwork and position. Upload one image per request.");
    // Reject the entire batch before creating any files when validation fails.
    try {
      let total = 0;
      for (const artwork of parsed.data.artwork)
        total += validateImage(artwork.data, maxBytes).bytes.length;
      if (total > 2 * 1024 * 1024)
        return fail(
          "Combined artwork must be at most 2 MB. Reduce image sizes and retry.",
          413,
        );
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Invalid artwork.");
    }
    const files = [];
    const deadline = AbortSignal.timeout(45000);
    for (const artwork of parsed.data.artwork)
      files.push({
        token: artwork.token,
        position: artwork.position,
        ...(await saveArtwork(
          { ...artwork, reference: parsed.data.reference },
          { endpoint, secret, maxBytes, signal: deadline },
        )),
      });
    return Response.json({ files }, { headers });
  } catch (error) {
    return fail(
      error instanceof Error &&
        /^(Artwork|Invalid |Truncated |Use PNG|Drive )/.test(error.message)
        ? error.message
        : "Artwork upload failed. Your files are kept; please retry.",
      502,
    );
  }
}
