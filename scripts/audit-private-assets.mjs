import { promises as fs } from "node:fs";
import path from "node:path";
const csv = await fs.readFile("private/coupons.csv", "utf8");
const rows = csv
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split(","));
if (
  rows.length !== 30 ||
  new Set(rows.map((r) => r[0])).size !== 30 ||
  [15, 20, 30].some((p) => rows.filter((r) => Number(r[1]) === p).length !== 10)
)
  throw new Error("Invalid private coupon distribution.");
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : [path.join(dir, e.name)],
      ),
    )
  ).flat();
}
const publicFiles = [
  ...(await walk("public")),
  ...(await walk(".next/static")),
];
// Audit the actual adapter package as well, when a Workers build exists.
try {
  await fs.access(".open-next/worker.js");
  publicFiles.push(...(await walk(".open-next")));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
for (const file of publicFiles) {
  const content = await fs.readFile(file);
  if (rows.some(([code]) => content.includes(Buffer.from(code))))
    throw new Error(`Private coupon material found in ${file}`);
}
for (const file of (await walk(".next/server")).filter((x) =>
  x.endsWith(".nft.json"),
)) {
  const trace = JSON.parse(await fs.readFile(file, "utf8"));
  if (
    trace.files.some((p) =>
      /(?:^|[\\/])(private|\.local|tests)(?:[\\/]|$)/.test(p),
    )
  )
    throw new Error(`Private/test files are traced by ${file}`);
}
console.log(
  `Verified 30 private codes (10 per discount), no plaintext in ${publicFiles.length} public/client and available Workers build files, and no private/test files in server deployment traces.`,
);
