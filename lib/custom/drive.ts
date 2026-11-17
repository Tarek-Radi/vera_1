import "server-only";
import { z } from "zod";
import { imageSize } from "image-size";
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function imageCode(position: number) {
  let value = "";
  while (value.length < 8) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const byte of bytes) {
      if (byte < 256 - (256 % alphabet.length))
        value += alphabet[byte % alphabet.length];
      if (value.length === 8) break;
    }
  }
  return `VERA-${value.slice(0, 4)}-${value.slice(4)}-${position}`;
}
export const uploadSchema = z
  .object({
    reference: z.string().regex(/^VERA-CUSTOM-[a-f0-9-]{36}$/),
    token: z.string().uuid(),
    position: z.number().int().min(1).max(7),
    data: z.string().min(4),
  })
  .strict();
export const savedArtworkSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  code: z
    .string()
    .regex(
      /^VERA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[1-7]$/,
    ),
  filename: z.string(),
  url: z.string().url(),
  folderUrl: z.string().url(),
});
export type SavedArtwork = z.infer<typeof savedArtworkSchema>;
export function validateImage(data: string, maxBytes: number) {
  if (
    data.length > Math.ceil(maxBytes / 3) * 4 ||
    data.length % 4 ||
    /[^A-Za-z0-9+/=]/.test(data)
  )
    throw new Error("Invalid image encoding or upload size.");
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > maxBytes)
    throw new Error("Artwork exceeds the upload size limit.");
  if (bytes.toString("base64") !== data)
    throw new Error("Invalid image encoding.");
  let info;
  try {
    info = imageSize(bytes);
  } catch {
    throw new Error("Invalid PNG, JPEG or WebP artwork.");
  }
  if (
    !["png", "jpg", "webp"].includes(info.type || "") ||
    !info.width ||
    !info.height ||
    info.width * info.height > 40_000_000
  )
    throw new Error("Use PNG, JPEG or WebP artwork up to 40 megapixels.");
  // Validate complete container boundaries, not the browser MIME or extension.
  if (info.type === "png") {
    let offset = 8,
      image = false,
      end = false;
    while (offset + 12 <= bytes.length) {
      const len = bytes.readUInt32BE(offset),
        tag = bytes.toString("ascii", offset + 4, offset + 8);
      if (offset + 12 + len > bytes.length) break;
      if (tag === "IDAT" && len) image = true;
      offset += 12 + len;
      if (tag === "IEND") {
        end = len === 0 && offset === bytes.length;
        break;
      }
    }
    if (!image || !end) throw new Error("Truncated PNG artwork.");
  }
  if (
    info.type === "jpg" &&
    (bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes[bytes.length - 2] !== 255 ||
      bytes[bytes.length - 1] !== 217 ||
      bytes.indexOf(Buffer.from([255, 218])) < 0)
  )
    throw new Error("Truncated JPEG artwork.");
  if (
    info.type === "webp" &&
    (bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.readUInt32LE(4) + 8 !== bytes.length)
  )
    throw new Error("Truncated WebP artwork.");
  const extension = info.type as "png" | "jpg" | "webp";
  return {
    bytes,
    extension,
    mime: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
  };
}
export async function saveArtwork(
  input: { reference: string; token: string; position: number; data: string },
  options: {
    endpoint: string;
    secret: string;
    maxBytes: number;
    signal?: AbortSignal;
  },
  send: typeof fetch = fetch,
): Promise<SavedArtwork> {
  const image = validateImage(input.data, options.maxBytes);
  for (let attempt = 0; attempt < 5; attempt++) {
    options.signal?.throwIfAborted();
    const code = imageCode(input.position);
    const response = await send(options.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        secret: options.secret,
        code,
        extension: image.extension,
        mime: image.mime,
      }),
      signal: options.signal || AbortSignal.timeout(45000),
      redirect: "follow",
    });
    if (!response.ok)
      throw new Error(
        "Drive upload failed. Your artwork is kept; retry shortly.",
      );
    const result = await response.json();
    if (result.error === "COLLISION") continue;
    if (result.ok !== true || result.error) {
      const d = result.diagnostic;
      const diagnostic =
        d &&
        /^[a-z0-9-]{1,60}$/.test(d.id) &&
        /^[a-z_]{1,40}$/.test(d.stage) &&
        /^[A-Z_]{1,40}$/.test(d.code)
          ? ` Reference ${d.id}; stage ${d.stage}; code ${d.code}. Check Apps Script Executions.`
          : "";
      throw new Error(
        "Drive could not save this artwork. Retry or contact VERA." +
          diagnostic,
      );
    }
    const saved = savedArtworkSchema.parse(result.file);
    if (
      saved.filename !== `${saved.code}.${image.extension}` ||
      !saved.code.endsWith(`-${input.position}`) ||
      saved.url !== `https://drive.google.com/file/d/${saved.id}/view` ||
      !/^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]+$/.test(
        saved.folderUrl,
      )
    )
      throw new Error("Invalid Drive upload response.");
    return saved;
  }
  throw new Error("Artwork code collision. Please retry.");
}
