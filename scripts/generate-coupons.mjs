import { randomBytes, createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function generateCoupons() {
  const codes = new Set();
  return [15, 20, 30].flatMap((discount) =>
    Array.from({ length: 10 }, () => {
      let code;
      do {
        code = randomBytes(12)
          .toString("hex")
          .toUpperCase()
          .match(/.{1,6}/g)
          .join("-");
      } while (codes.has(code));
      codes.add(code);
      return { code, discount_percent: discount, status: "AVAILABLE" };
    }),
  );
}
export async function writeCoupons(root) {
  const dir = path.join(root, "private");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "coupons.csv");
  const coupons = generateCoupons();
  await fs.writeFile(
    file,
    "code,discount_percent,status\n" +
      coupons
        .map((c) => `${c.code},${c.discount_percent},${c.status}`)
        .join("\n") +
      "\n",
    { flag: "wx", mode: 0o600 },
  );
  return coupons;
}
export async function initializeCoupons(root) {
  const secret = process.env.COUPON_HMAC_SECRET;
  if (!secret || secret.length < 32 || !process.env.DATABASE_URL)
    throw new Error(
      "Set DATABASE_URL and COUPON_HMAC_SECRET (32+ characters) first.",
    );
  const csv = await fs.readFile(path.join(root, "private/coupons.csv"), "utf8");
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(","));
  if (
    rows.length !== 30 ||
    new Set(rows.map((r) => r[0])).size !== 30 ||
    [15, 20, 30].some(
      (n) => rows.filter((r) => Number(r[1]) === n).length !== 10,
    ) ||
    rows.some((r) => !/^[A-F0-9]{6}(-[A-F0-9]{6}){3}$/.test(r[0]))
  )
    throw new Error("Invalid private coupon file.");
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, {
    prepare: false,
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  });
  try {
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(86421007)`;
      const verifiers = rows.map(([code, percent]) => ({
        code_verifier: createHmac("sha256", secret).update(code).digest("hex"),
        discount_percent: Number(percent),
      }));
      const existing =
        await tx`select code_verifier, discount_percent from coupons`;
      if (
        existing.some(
          (e) =>
            !verifiers.some(
              (v) =>
                v.code_verifier === e.code_verifier &&
                v.discount_percent === e.discount_percent,
            ),
        )
      )
        throw new Error(
          "Database contains a different coupon batch or HMAC secret. Initialization stopped without changing data.",
        );
      for (const row of verifiers)
        await tx`insert into coupons ${tx(row)} on conflict (code_verifier) do nothing`;
    });
  } finally {
    await sql.end();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.argv.includes("--init")) {
      await initializeCoupons(process.cwd());
      console.log(
        "Coupon verifiers initialized. Existing redemption states preserved.",
      );
    } else {
      await writeCoupons(process.cwd());
      console.log(
        "Exactly 30 coupons saved privately to private/coupons.csv. No codes printed.",
      );
    }
  } catch (e) {
    console.error(
      e.code === "EEXIST"
        ? "private/coupons.csv already exists. Kept the existing coupon batch."
        : e.message,
    );
    process.exitCode = 1;
  }
}
