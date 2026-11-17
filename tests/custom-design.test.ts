import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { artworkFormat, artworkZip } from "../lib/custom/artwork";
import {
  customMessage,
  customHandoff,
  hoodieOptions,
} from "../lib/custom/request";
import { printPositions } from "../config/custom-design";
import { testCustomer } from "./fixtures";
const reference = "VERA-CUSTOM-0a127446-715a-4d38-a812-625cbb3d5800";
const input = {
  reference,
  customer: testCustomer,
  variants: [
    { color: "Black", size: hoodieOptions[0].sizes[0], quantity: 2 },
    { color: "Burgundy", size: hoodieOptions[1].sizes[0], quantity: 3 },
  ],
  artwork: [
    {
      position: 1,
      filename: "رسم & logo.png",
      extension: "png",
      note: "Centered",
    },
    { position: 7, filename: "back.jpg", extension: "jpg", note: "" },
  ],
};
describe("independent custom requests", () => {
  it("formats only custom variants, filenames and customer details without credentials", () => {
    const message = customMessage(input);
    expect(message).toContain("Total quantity: 5");
    expect(message).toContain(testCustomer.name);
    expect(message).toContain("رسم & logo.png → 1.png");
    expect(message).toContain("back.jpg → 7.jpg");
    expect(message).toContain("Price to be confirmed");
    expect(message).not.toContain("blob:");
    const handoff = customHandoff("201009785343", message);
    expect(new URL(handoff.whatsappUrl).searchParams.get("text")).toBe(message);
  });
  it("rejects missing destination and invalid variants/artwork/customer", () => {
    expect(() => customHandoff("", "request")).toThrow(
      "storeWhatsApp in config/brand.ts",
    );
    for (const quantity of [0, -1, 1.5, NaN, 1000])
      expect(() =>
        customMessage({
          ...input,
          variants: [{ ...input.variants[0], quantity }],
        }),
      ).toThrow();
    expect(() => customMessage({ ...input, artwork: [] })).toThrow();
    expect(() =>
      customMessage({ ...input, customer: { ...testCustomer, name: "" } }),
    ).toThrow();
    expect(() =>
      customMessage({
        ...input,
        variants: [{ ...input.variants[0], size: "INVALID" }],
      }),
    ).toThrow();
  });
  it("keeps the final sleeve and hood mapping", () => {
    expect(printPositions.find((p) => p.id === 4)).toMatchObject({
      view: "front",
      x: 18.6,
      y: 83.9,
    });
    expect(printPositions.find((p) => p.id === 5)).toMatchObject({
      view: "front",
      x: 81.2,
      y: 83.9,
    });
    expect(printPositions.find((p) => p.id === 6)?.label).toBe("On the hood");
  });
  it("detects actual formats and rejects unsupported/oversize files", async () => {
    expect(
      (
        await artworkFormat(
          new Blob([new Uint8Array([255, 216, 255, 0])], { type: "image/png" }),
        )
      ).extension,
    ).toBe("jpg");
    expect((await artworkFormat(new Blob(["RIFF1234WEBP"]))).extension).toBe(
      "webp",
    );
    await expect(artworkFormat(new Blob(["<svg/>"]))).rejects.toThrow(
      "Unsupported",
    );
    await expect(
      artworkFormat(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)])),
    ).rejects.toThrow("5 MB");
  });
  it("exports numbered files with unchanged bytes and a UTF-8 summary", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const message = customMessage(input);
    const blob = await artworkZip(
      reference,
      [
        new File([bytes], "1.png"),
        new File([new Uint8Array([255, 216, 255])], "7.jpg"),
      ],
      message,
    );
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(entries)).toEqual([
      `${reference}/summary.txt`,
      `${reference}/1.png`,
      `${reference}/7.jpg`,
    ]);
    expect(entries[`${reference}/1.png`]).toEqual(bytes);
    expect(strFromU8(entries[`${reference}/summary.txt`])).toBe(message);
  });
});
