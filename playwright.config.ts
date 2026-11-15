import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "store.spec.ts",
  globalSetup: "./tests/e2e/setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        deviceScaleFactor: 1,
        defaultBrowserType: "chromium",
        channel: "msedge",
      },
    },
  ],
  webServer: {
    command: "node scripts/test-server.mjs",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
