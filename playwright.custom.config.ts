import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "custom-design.spec.ts",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8790", channel: "msedge" },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 8790",
    url: "http://127.0.0.1:8790",
    timeout: 90000,
    env: {
      VERA_CUSTOM_TEST: "1",
      ARTWORK_SCRIPT_URL: "",
      ARTWORK_SCRIPT_SECRET: "",
      DATABASE_URL: "",
      COUPON_HMAC_SECRET: "",
    },
  },
});
