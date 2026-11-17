/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { createHash } from "node:crypto";
import { imageCode, validateImage, saveArtwork } from "../lib/custom/drive";
import { POST } from "../app/api/custom-artwork/route";
const root = "1IS01GtI2kiI5LFOVb1IaO_pAkfZFx1iT";
const reference = "VERA-CUSTOM-0a127446-715a-4d38-a812-625cbb3d5800";
const token = "0a127446-715a-4d38-a812-625cbb3d5801";
const data =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
const secret = "test-only-".repeat(5);
function harness() {
  const records = new Map<string, any>([
    [root, { id: root, name: "root", parents: [] }],
  ]);
  let serial = 0,
    held = false,
    creates = 0,
    loseResponse = false,
    failPrimary = false;
  const metadata: any = {
    main: JSON.stringify({
      revision: 0,
      tokens: {},
      codes: {},
      folders: {},
      day: "",
      count: 0,
    }),
    backup: JSON.stringify({
      revision: 0,
      tokens: {},
      codes: {},
      folders: {},
      day: "",
      count: 0,
    }),
  };
  const props: any = {
    ARTWORK_SCRIPT_SECRET: secret,
    INDEX_FILE_ID: "main",
    INDEX_BACKUP_ID: "backup",
  };
  const context = createContext({
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (value: string) => ({ setMimeType: () => value }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props[k],
        setProperty: (k: string, v: string) => (props[k] = v),
      }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => {
          expect(held).toBe(false);
          held = true;
        },
        releaseLock: () => {
          held = false;
        },
      }),
    },
    Utilities: {
      base64Decode: (s: string) => [...Buffer.from(s, "base64")],
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (_: string, b: number[]) => [
        ...createHash("sha256").update(Buffer.from(b)).digest(),
      ],
      newBlob: (bytes: number[], mime: string, name: string) => ({
        bytes,
        mime,
        name,
      }),
    },
    DriveApp: {
      getFileById: (id: string) => ({
        getBlob: () => ({ getDataAsString: () => metadata[id] }),
        setContent: (s: string) => {
          expect(held).toBe(true);
          if (id === "main" && failPrimary) {
            failPrimary = false;
            throw Error("interrupted index write");
          }
          metadata[id] = s;
        },
      }),
      getFolderById: (id: string) => ({
        createFolder: (name: string) => {
          expect(held).toBe(true);
          const child = {
            id: `folder${++serial}`,
            name,
            parents: [id],
            mimeType: "application/vnd.google-apps.folder",
          };
          records.set(child.id, child);
          return { getId: () => child.id };
        },
      }),
    },
    Drive: {
      Permissions: { list: () => ({ permissions: [{ type: "user" }] }) },
      Files: {
        list: ({ q }: any) => ({
          files: [...records.values()].filter((f) => {
            if (f.trashed) return false;
            const parent = q.match(/'([^']+)' in parents/);
            const name = q.match(/name = '([^']+)'/);
            return (
              (!parent || f.parents.includes(parent[1])) &&
              (!name || f.name === name[1])
            );
          }),
        }),
        get: (id: string) => {
          const r = records.get(id);
          if (!r) throw Error("404 File not found");
          return r;
        },
        generateIds: () => ({ ids: [`file${++serial}`] }),
        create: (record: any) => {
          expect(held).toBe(true);
          if (records.has(record.id)) throw Error("409 exists");
          creates++;
          records.set(record.id, record);
          if (loseResponse) {
            loseResponse = false;
            throw Error("response lost");
          }
          return record;
        },
      },
    },
  });
  runInContext(readFileSync("apps-script/Artwork.gs", "utf8"), context);
  return {
    records,
    metadata,
    props,
    context,
    get creates() {
      return creates;
    },
    lose: () => (loseResponse = true),
    failWrite: () => (failPrimary = true),
    post: (patch: any = {}) =>
      JSON.parse(
        (context.doPost as any)({
          postData: {
            contents: JSON.stringify({
              reference,
              token,
              position: 7,
              data,
              secret,
              code: "VERA-K7M4-X9Q2-7",
              extension: "png",
              ...patch,
            }),
          },
        }),
      ),
  };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Drive locking, index and retries (mocked Apps Script services)", () => {
  it("creates once and returns actual persisted metadata across retries", () => {
    const h = harness();
    const a = h.post();
    expect(a.ok).toBe(true);
    expect(a.file.filename).toBe("VERA-K7M4-X9Q2-7.png");
    expect(h.post({ code: "VERA-AAAA-BBBB-7" })).toEqual(a);
    expect(h.creates).toBe(1);
    expect(h.post({ data: Buffer.from("changed").toString("base64") }).ok).toBe(
      false,
    );
  });
  it("recovers a lost create response and a partially written index without duplicates", () => {
    const h = harness();
    h.lose();
    expect(h.post().ok).toBe(false);
    expect(h.post().ok).toBe(true);
    expect(h.creates).toBe(1);
    const g = harness();
    g.failWrite();
    expect(g.post().ok).toBe(false);
    expect(g.creates).toBe(0);
    expect(g.post({ code: "VERA-AAAA-BBBB-7" }).file.code).toBe(
      "VERA-K7M4-X9Q2-7",
    );
    expect(g.creates).toBe(1);
  });
  it("checks descendants for collisions, and fails closed for unavailable/corrupt storage", () => {
    const h = harness();
    h.records.set("nested", { id: "nested", name: "nested", parents: [root] });
    h.records.set("external", {
      id: "external",
      name: "VERA-K7M4-X9Q2-7.webp",
      parents: ["nested"],
    });
    expect(h.post().error).toBe("COLLISION");
    expect(h.creates).toBe(0);
    h.metadata.main = "broken";
    h.metadata.backup = "broken";
    expect(h.post().ok).toBe(false);
  });
  it("blocks unauthorized calls and new revisions after the daily limit", () => {
    const h = harness();
    expect(h.post({ secret: "wrong" }).ok).toBe(false);
    h.props.ARTWORK_DAILY_LIMIT = "1";
    expect(h.post().ok).toBe(true);
    expect(
      h.post({
        token: "0a127446-715a-4d38-a812-625cbb3d5802",
        code: "VERA-AAAA-BBBB-7",
      }).ok,
    ).toBe(false);
    expect(h.post().ok).toBe(true);
  });
});
describe("server validation and code generation", () => {
  it("validates real image containers and rejects unsupported, truncated and oversize data", () => {
    expect(validateImage(data, 1048576).extension).toBe("png");
    expect(() =>
      validateImage(Buffer.from("<svg/>").toString("base64"), 1048576),
    ).toThrow();
    expect(() => validateImage(data, 10)).toThrow();
    expect(() =>
      validateImage(
        Buffer.from(data, "base64").subarray(0, 30).toString("base64"),
        1048576,
      ),
    ).toThrow();
    for (let p = 1; p <= 7; p++)
      expect(imageCode(p)).toMatch(
        new RegExp(
          `^VERA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-${p}$`,
        ),
      );
  });
  it("regenerates only on a genuine collision and propagates upload failure", async () => {
    const h = harness();
    let calls = 0;
    const codes: string[] = [];
    const send = vi.fn(async (_url, options) => {
      const input = JSON.parse(options.body);
      codes.push(input.code);
      calls++;
      return Response.json(
        calls === 1 ? { ok: false, error: "COLLISION" } : h.post(input),
      );
    });
    const result = await saveArtwork(
      { reference, token, position: 7, data },
      {
        endpoint: "https://script.google.com/macros/s/test/exec",
        secret,
        maxBytes: 1048576,
      },
      send as any,
    );
    expect(result.id).toBeTruthy();
    expect(codes[0]).not.toBe(codes[1]);
    expect(h.creates).toBe(1);
    await expect(
      saveArtwork(
        { reference, token, position: 7, data },
        { endpoint: "unused", secret, maxBytes: 1048576 },
        vi.fn(async () => Response.json({ ok: false })) as any,
      ),
    ).rejects.toThrow("Drive could not save");
  });
});
describe("public upload route without database credentials", () => {
  beforeEach(() => {
    vi.stubEnv(
      "ARTWORK_SCRIPT_URL",
      "https://script.google.com/macros/s/test/exec",
    );
    vi.stubEnv("ARTWORK_SCRIPT_SECRET", secret);
    vi.stubEnv("SITE_URL", "https://vera.test");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("COUPON_HMAC_SECRET", "");
  });
  const req = (patch: any = {}, origin = "https://vera.test") =>
    new Request("https://vera.test/api/custom-artwork", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        reference,
        artwork: [{ token, position: 7, data }],
        ...patch,
      }),
    });
  it("saves, returns only saved file metadata, and retries the same ID", async () => {
    const h = harness();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, options) =>
        String(url).includes("siteverify")
          ? Response.json({
              success: true,
              hostname: "vera.test",
              action: "artwork",
            })
          : Response.json(h.post(JSON.parse(options.body))),
      ),
    );
    const a = await POST(req());
    expect(a.status).toBe(200);
    const b = await POST(req());
    expect(await a.json()).toEqual(await b.json());
    expect(h.creates).toBe(1);
  });
  it("rejects upload failure, invalid position/count/file, foreign origin and missing settings", async () => {
    const send = vi.fn(async () => Response.json({ success: false }));
    vi.stubGlobal("fetch", send);
    expect((await POST(req())).status).toBe(502);
    expect((await POST(req({}, "https://evil.test"))).status).toBe(403);
    expect(
      (
        await POST(
          req({ artwork: Array(8).fill({ token, position: 7, data }) }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await POST(req({ artwork: [{ token, position: 8, data }] }))).status,
    ).toBe(400);
    send.mockResolvedValue(
      Response.json({
        success: true,
        hostname: "vera.test",
        action: "artwork",
      }),
    );
    expect(
      (await POST(req({ artwork: [{ token, position: 7, data: "PHN2Zy8+" }] })))
        .status,
    ).toBe(400);
    vi.stubEnv("ARTWORK_SCRIPT_SECRET", "");
    expect((await POST(req())).status).toBe(503);
  });
  it("does not claim success after Drive failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        String(url).includes("siteverify")
          ? Response.json({
              success: true,
              hostname: "vera.test",
              action: "artwork",
            })
          : Response.json({ ok: false, error: "UPLOAD_FAILED" }),
      ),
    );
    expect((await POST(req())).status).toBe(502);
  });
});
