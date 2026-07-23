import { expect, test, type Page } from "@playwright/test";

const physicsPlan = {
  schemaVersion: 1,
  programmeIds: ["imperial-h401"],
  moduleIds: ["mathematics-1", "physics", "mathematics-2"],
  entryCycle: "2027",
  curriculumId: "ap",
  courseIds: ["ap-precalculus", "ap-calculus-bc", "ap-physics-1"],
  updatedAt: "2026-07-19T13:00:00.000Z",
};

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("ESAT Physics full mock opens natively and persists at the current viewport", async ({ page }) => {
  await page.addInitScript((storedPlan) => {
    globalThis.localStorage.setItem(
      "admission-test-breaker.esat-plan.v1",
      JSON.stringify(storedPlan),
    );
  }, physicsPlan);

  const libraryResponse = await page.goto("/exams/esat/past-papers");
  expect(libraryResponse?.ok()).toBe(true);
  await expect(page.getByRole("heading", {
    level: 2,
    name: /完整模考.*Full-length practice/u,
  })).toBeVisible();
  await expect(page.getByRole("link", { name: /Physics.*27 题.*开始完整模考/u })).toBeVisible();

  await page.getByRole("link", { name: /Physics.*开始完整模考/u }).click();
  await expect(page).toHaveURL(/\/practice\/esat-physics-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 0 / 27");
  await expect(page.getByText(/PHYSICS.*ORIGINAL FULL-LENGTH MOCK.*满托原创完整模考/u)).toBeVisible();

  await page.getByRole("radio", { name: "选项 C" }).check();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 1 / 27");
  await expectNoDocumentOverflow(page);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "选项 C" })).toBeChecked();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 1 / 27");
  await expectNoDocumentOverflow(page);
});
