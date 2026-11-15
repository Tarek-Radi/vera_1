import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  parseProduct,
  generateCatalog,
} from "../scripts/generate-products.mjs";
import config from "../config/catalog.json";
describe("filename catalog", () => {
  it.each([
    ["black_hoodie_600.jpeg", "Black Hoodie", "hoodies", 60000],
    ["burgundy_Hijab_250.jpeg", "Burgundy Hijab", "hijabs", 25000],
    ["white_Hijab_250.jpeg", "White Hijab", "hijabs", 25000],
  ])("parses %s", (file, name, category, price) => {
    const p = parseProduct(file, config);
    expect(p).toMatchObject({ name, category, priceMinor: price });
  });
  it.each([
    "some-Hoodies.jpeg",
    "invalid.jpg",
    "black_hoodie_free.png",
    "red_unknown_20.jpg",
    "black_hoodie_0.jpg",
    "black_hoodie_20.svg",
  ])("skips %s", (file) => expect(parseProduct(file, config)).toBeNull());
  it("keeps identity independent of price, extension and case", () => {
    expect(parseProduct("BLACK_HOODIE_700.PNG", config)?.sku).toBe(
      parseProduct("black_hoodie_600.jpeg", config)?.sku,
    );
  });
  it("keeps different models distinct and only groups explicitly", () => {
    expect(parseProduct("second/black_hoodie_600.jpg", config)?.sku).not.toBe(
      parseProduct("black_hoodie_600.jpg", config)?.sku,
    );
    expect(
      parseProduct("second/black_hoodie_600.jpg", config)?.family,
    ).toBeNull();
  });
  it("requires approval before showing a reference price", () => {
    expect(
      parseProduct("black_hoodie_600.jpg", config)?.compareAtMinor,
    ).toBeNull();
    const approved = structuredClone(config);
    approved.pricing.hoodies.referencePriceApproved = true;
    expect(parseProduct("black_hoodie_600.jpg", approved)).toMatchObject({
      priceMinor: 60000,
      compareAtMinor: 65000,
    });
  });
  it("handles missing folders, detects additions, persists metadata and rejects duplicate identities", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "vera-catalog-"));
    try {
      await mkdir(path.join(root, "config"));
      await writeFile(
        path.join(root, "config/catalog.json"),
        JSON.stringify(config),
      );
      expect((await generateCatalog(root)).products).toHaveLength(0);
      await mkdir(path.join(root, "collection"));
      await writeFile(
        path.join(root, "collection/black_hoodie_600.jpeg"),
        "fixture",
      );
      const first = await generateCatalog(root, "2026-11-15T00:00:00.000Z");
      expect(first.products).toHaveLength(1);
      await rm(path.join(root, "collection/black_hoodie_600.jpeg"));
      await writeFile(
        path.join(root, "collection/black_hoodie_700.jpeg"),
        "fixture",
      );
      await writeFile(
        path.join(root, "collection/white_Hijab_250.jpeg"),
        "new fixture",
      );
      const next = await generateCatalog(root, "2026-11-16T00:00:00.000Z");
      expect(next.products).toHaveLength(2);
      expect(next.products.find((p) => p.color === "Black")).toMatchObject({
        sku: first.products[0].sku,
        slug: first.products[0].slug,
        firstSeenAt: first.products[0].firstSeenAt,
        priceMinor: 70000,
      });
      expect(
        JSON.parse(
          await readFile(path.join(root, "generated/catalog.json"), "utf8"),
        ).products,
      ).toHaveLength(2);
      await writeFile(
        path.join(root, "collection/black_hoodie_800.png"),
        "duplicate",
      );
      await expect(generateCatalog(root)).rejects.toThrow(
        "Duplicate product identity",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
