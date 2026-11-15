import { promises as fs } from "node:fs";
import { createHmac } from "node:crypto";
import postgres from "postgres";
const secret = process.env.COUPON_HMAC_SECRET;
if (!secret || secret.length < 32 || !process.env.DATABASE_URL)
  throw new Error("Configure DATABASE_URL and COUPON_HMAC_SECRET first.");
const file = new URL("../private/coupons.csv", import.meta.url);
const rows = (await fs.readFile(file, "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((x) => x.split(","));
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
});
try {
  const records = await sql`select code_verifier, status from coupons`;
  const updated = rows.map(([code, percent]) => {
    const hash = createHmac("sha256", secret).update(code).digest("hex");
    const record = records.find((x) => x.code_verifier === hash);
    if (!record)
      throw new Error(
        "A coupon is not initialized with this secret. Private CSV left unchanged.",
      );
    return `${code},${percent},${record.status}`;
  });
  await fs.writeFile(
    file,
    "code,discount_percent,status\n" + updated.join("\n") + "\n",
    { mode: 0o600 },
  );
  console.log(
    "Updated private CSV statuses from the database. No codes printed.",
  );
} finally {
  await sql.end();
}
