import { MAX_ARTWORK_BYTES } from "../../config/custom-design";
export type ArtworkFormat = { extension: "png" | "jpg" | "webp"; mime: string };
export async function artworkFormat(file: Blob): Promise<ArtworkFormat> {
  if (!file.size || file.size > MAX_ARTWORK_BYTES)
    throw new Error("Choose a non-empty image up to 5 MB.");
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v))
    return { extension: "png", mime: "image/png" };
  if (b[0] === 255 && b[1] === 216 && b[2] === 255)
    return { extension: "jpg", mime: "image/jpeg" };
  if (
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return { extension: "webp", mime: "image/webp" };
  throw new Error("Unsupported artwork. Choose a PNG, JPEG or WebP image.");
}
export async function artworkZip(
  reference: string,
  files: File[],
  summary: string,
) {
  const { zipSync, strToU8 } = await import("fflate");
  const entries: Record<string, Uint8Array> = {
    [`${reference}/summary.txt`]: strToU8(summary),
  };
  for (const file of files)
    entries[`${reference}/${file.name}`] = new Uint8Array(
      await file.arrayBuffer(),
    );
  return new Blob([new Uint8Array(zipSync(entries, { level: 0 })).buffer], {
    type: "application/zip",
  });
}
