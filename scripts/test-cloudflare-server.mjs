// Only local fixtures: separate config directory prevents loading real .dev.vars.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readCloudflareConfig } from "./read-cloudflare-config.mjs";
const value = process.env.TEST_DATABASE_URL;
if (!value)
  throw new Error(
    "Set TEST_DATABASE_URL to an isolated local vera_test database.",
  );
const url = new URL(value);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/vera_test"
)
  throw new Error(
    "Workers E2E requires localhost and a database named vera_test.",
  );
const config = await readCloudflareConfig();
config.name = "vera-isolated-local-test";
delete config.account_id;
delete config.routes;
config.main = path.resolve(".open-next/worker.js");
config.assets.directory = path.resolve(".open-next/assets");
config.services = [{ binding: "WORKER_SELF_REFERENCE", service: config.name }];
config.vars = {
  VERA_RUNTIME: "cloudflare",
  DATABASE_URL: value,
  DATABASE_SSL: "disable",
  COUPON_HMAC_SECRET: "only-for-automated-tests-never-use-in-production",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:8788",
  SITE_URL: "http://127.0.0.1:8788",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
};
await mkdir(".local/cloudflare-test", { recursive: true });
await writeFile(
  ".local/cloudflare-test/wrangler.json",
  JSON.stringify(config, null, 2),
);
const child = spawn(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--config",
    ".local/cloudflare-test/wrangler.json",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    "8788",
    "--inspector-port",
    "9230",
    "--log-level",
    "warn",
  ],
  {
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: "false",
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
