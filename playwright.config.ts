import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:4173/job-experience/",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build:pages && npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173/job-experience/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
