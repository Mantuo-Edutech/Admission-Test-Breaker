import { expect, test, type Page } from "@playwright/test";

const chemistryPlan = {
  schemaVersion: 1,
  programmeIds: ["imperial-h801"],
  moduleIds: ["mathematics-1", "chemistry", "mathematics-2"],
  entryCycle: "2027",
  curriculumId: "a-level",
  courseIds: ["al-mathematics", "al-chemistry"],
  updatedAt: "2026-07-19T15:00:00.000Z",
};

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("ESAT Chemistry full mock opens natively and persists at the current viewport", async ({ page }) => {
  await page.addInitScript((storedPlan) => {
    globalThis.localStorage.setItem(
      "admission-test-breaker.esat-plan.v1",
      JSON.stringify(storedPlan),
    );
  }, chemistryPlan);

  const libraryResponse = await page.goto("/exams/esat/past-papers");
  expect(libraryResponse?.ok()).toBe(true);
  await expect(page.getByRole("heading", {
    level: 2,
    name: /Full Mocks/u,
  })).toBeVisible();
  await expect(page.getByRole("link", { name: "Chemistry full mock, 27 questions, 40 minutes. Start." })).toBeVisible();

  await page.getByRole("link", { name: "Chemistry full mock, 27 questions, 40 minutes. Start." }).click();
  await expect(page).toHaveURL(/\/practice\/esat-chemistry-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "0 of 27 answered");
  await expect(page.getByText(/CHEMISTRY.*ORIGINAL FULL-LENGTH MOCK/u)).toBeVisible();

  await page.getByRole("radio", { name: "Option B" }).check();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "1 of 27 answered");
  await expectNoDocumentOverflow(page);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Option B" })).toBeChecked();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "1 of 27 answered");
  await expectNoDocumentOverflow(page);
});
