import { defineConfig } from "@playwright/test";

const baseURL = process.env.DEPLOYMENT_BASE_URL?.trim();
if (!baseURL) throw new Error("DEPLOYMENT_BASE_URL is required for deployment smoke tests");

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "deployment-smoke.spec.ts",
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["line"], ["html", { open: "never", outputFolder: "playwright-deployment-report" }]],
  use: {
    baseURL,
    browserName: "chromium",
    colorScheme: "light",
    locale: "zh-CN",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "deployed-desktop",
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "deployed-phone",
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
      },
    },
  ],
});
