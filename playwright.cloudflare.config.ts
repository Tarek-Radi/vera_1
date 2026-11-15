import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: ["store.spec.ts", "cloudflare.spec.ts"],
  use: { ...base.use, baseURL: "http://127.0.0.1:8788" },
  webServer: {
    command: "node scripts/test-cloudflare-server.mjs",
    url: "http://127.0.0.1:8788",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
