import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',testMatch:'whatsapp-only.spec.ts',workers:1,use:{baseURL:'http://127.0.0.1:8789',channel:'msedge'},webServer:{command:'node scripts/test-whatsapp-server.mjs',url:'http://127.0.0.1:8789',timeout:90000}});
