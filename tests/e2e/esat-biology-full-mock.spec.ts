import { expect, test, type Page } from "@playwright/test";

const biologyPlan = {
  schemaVersion: 1,
  programmeIds: ["imperial-c700"],
  moduleIds: ["mathematics-1", "biology", "chemistry"],
  entryCycle: "2027",
  curriculumId: "a-level",
  courseIds: ["al-mathematics", "al-biology", "al-chemistry"],
  updatedAt: "2026-07-19T16:00:00.000Z",
};

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("ESAT Biology full mock opens natively and persists at the current viewport", async ({ page }) => {
  await page.addInitScript((storedPlan) => {
    globalThis.localStorage.setItem(
      "admission-test-breaker.esat-plan.v1",
      JSON.stringify(storedPlan),
    );
  }, biologyPlan);

  const libraryResponse = await page.goto("/exams/esat/past-papers");
  expect(libraryResponse?.ok()).toBe(true);
  await expect(page.getByRole("link", { name: "Biology full mock, 27 questions, 40 minutes. Start." })).toBeVisible();

  await page.getByRole("link", { name: "Biology full mock, 27 questions, 40 minutes. Start." }).click();
  await expect(page).toHaveURL(/\/practice\/esat-biology-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "0 of 27 answered");
  await expect(page.getByText(/BIOLOGY.*ORIGINAL FULL-LENGTH MOCK/u)).toBeVisible();

  await page.getByRole("radio", { name: "Option D" }).check();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "1 of 27 answered");
  await expectNoDocumentOverflow(page);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Option D" })).toBeChecked();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "1 of 27 answered");
  await expectNoDocumentOverflow(page);
});
