// Dedicated E2E fixture server. Never points at Supabase or a production database.
import { spawn } from "node:child_process";
const testDatabase = process.env.TEST_DATABASE_URL;
if (!testDatabase)
  throw new Error("Set TEST_DATABASE_URL to a disposable vera_test database.");
const url = new URL(testDatabase);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/vera_test"
)
  throw new Error("E2E server requires a local disposable vera_test database.");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--port",
    "3100",
    "--hostname",
    "127.0.0.1",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: testDatabase,
      DATABASE_SSL: "disable",
      COUPON_HMAC_SECRET: "only-for-automated-tests-never-use-in-production",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGTERM", () => child.kill());
