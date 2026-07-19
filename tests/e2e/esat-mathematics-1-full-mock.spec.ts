import { expect, test, type Page } from "@playwright/test";

const mathematicsOnePlan = {
  schemaVersion: 1,
  programmeIds: ["imperial-h401"],
  moduleIds: ["mathematics-1", "physics", "mathematics-2"],
  entryCycle: "2027",
  curriculumId: "ap",
  courseIds: ["ap-precalculus", "ap-calculus-bc", "ap-physics-1"],
  updatedAt: "2026-07-19T12:00:00.000Z",
};

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("ESAT Mathematics 1 full mock opens natively and persists at the current viewport", async ({ page }) => {
  await page.addInitScript((storedPlan) => {
    globalThis.localStorage.setItem(
      "admission-test-breaker.esat-plan.v1",
      JSON.stringify(storedPlan),
    );
  }, mathematicsOnePlan);

  const libraryResponse = await page.goto("/exams/esat/past-papers");
  expect(libraryResponse?.ok()).toBe(true);
  await expect(page.getByRole("heading", {
    level: 2,
    name: /用完整模考校准每个模块的做题节奏.*Calibrate each required module/u,
  })).toBeVisible();
  await expect(page.getByText("27 道", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /Mathematics 1.*开始完整模考/u }).click();
  await expect(page).toHaveURL(/\/practice\/esat-mathematics-1-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 0 / 27");
  await expect(page.getByText(/ORIGINAL FULL-LENGTH MOCK.*满托原创完整模考/u)).toBeVisible();

  await page.getByRole("radio", { name: "选项 B" }).check();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 1 / 27");
  await expectNoDocumentOverflow(page);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "选项 B" })).toBeChecked();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 1 / 27");
  await expectNoDocumentOverflow(page);
});
