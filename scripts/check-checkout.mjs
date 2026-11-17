import { readCloudflareConfig } from "./read-cloudflare-config.mjs";
import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import postgres from "postgres";
const workers = process.argv.includes("--workers");
const file = workers ? ".dev.vars" : ".env.local";
if (existsSync(file)) loadEnvFile(file);
console.log(
  `Checking ${workers ? "local Workers preview" : "local Next.js"} checkout configuration (${file}). Secret values are never printed.`,
);
const mode =
  (workers
    ? (await readCloudflareConfig()).vars?.NEXT_PUBLIC_CHECKOUT_MODE
    : process.env.NEXT_PUBLIC_CHECKOUT_MODE) || "whatsapp";
if (!["whatsapp", "database"].includes(mode))
  throw new Error("Invalid NEXT_PUBLIC_CHECKOUT_MODE");
const source = readFileSync("config/brand.ts", "utf8");
const destination = source
  .match(/const storeWhatsApp\s*=\s*"([^"]*)"/)?.[1]
  ?.replace(/[+\s().-]/g, "");
if (!destination || !/^[1-9]\d{7,14}$/.test(destination)) {
  console.error(
    "Configure storeWhatsApp in config/brand.ts with a valid international number.",
  );
  process.exit(1);
}
if (mode === "whatsapp") {
  console.log(
    "WhatsApp-only mode: destination configured. No database, Supabase or coupon secret required. Rebuild after changing mode.",
  );
  process.exit(0);
}
const missing = ["DATABASE_URL", "COUPON_HMAC_SECRET"].filter(
  (name) => !process.env[name]?.trim(),
);
if (missing.length) {
  console.error(
    `Missing: ${missing.join(", ")}. Copy ${workers ? ".dev.vars.example" : ".env.example"} to ${file} and fill the existing store credentials privately. Cloudflare production requires Worker secrets separately.`,
  );
  process.exit(1);
}
if (process.env.COUPON_HMAC_SECRET.length < 32) {
  console.error(
    "COUPON_HMAC_SECRET must have at least 32 characters. Preserve the secret used to import existing coupons.",
  );
  process.exit(1);
}
let sql;
try {
  const uri = new URL(process.env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(uri.protocol))
    throw new Error("Invalid database scheme");
  sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  });
  const rows =
    await sql`select table_name, column_name from information_schema.columns where table_schema='public' and table_name in ('orders','order_items','coupons','coupon_reservations','order_events','rate_limits','admin_users')`;
  const tables = new Set(rows.map((r) => r.table_name));
  const required = [
    "orders",
    "order_items",
    "coupons",
    "coupon_reservations",
    "order_events",
    "rate_limits",
    "admin_users",
  ];
  if (
    required.some((t) => !tables.has(t)) ||
    !rows.some(
      (r) => r.table_name === "orders" && r.column_name === "customer_details",
    )
  ) {
    console.error(
      "Database connected, but store schema is incomplete. Back up the existing database and run npm run db:migrate with its DATABASE_URL (includes 002_checkout_customer.sql).",
    );
    process.exitCode = 1;
  } else
    console.log(
      "Database connection and checkout schema passed. No records were changed. Coupon availability and actual Worker connectivity still require their own checks.",
    );
} catch {
  console.error(
    "Database connection/check failed. Verify DATABASE_URL, pooler hostname/password, DATABASE_SSL and network access. No credentials were logged.",
  );
  process.exitCode = 1;
} finally {
  await sql?.end({ timeout: 3 });
}
