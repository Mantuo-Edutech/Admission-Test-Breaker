import { expect, test, type Page } from "@playwright/test";

const guestSpace = {
  id: "gsp_ucat-dm-full-mock-e2e",
  ownerActorId: "guest_ucat-dm-full-mock-e2e",
  status: "unclaimed",
  createdAt: "2026-07-19T22:00:00.000Z",
};

const profile = {
  schemaVersion: 1,
  guestSpaceId: guestSpace.id,
  examId: "ucat",
  entryCycle: "2027",
  curriculumId: "ib",
  learningStage: "year-12",
  subjectAreas: ["biology", "chemistry", "mathematics"],
  experience: "sampled",
  weeklyTime: "2-4",
  createdAt: "2026-07-19T22:00:00.000Z",
  updatedAt: "2026-07-19T22:00:00.000Z",
};

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function selectQuestion(page: Page, questionNumber: number) {
  const visibleQuestionButton = page.locator(
    `button[aria-label^="Question ${questionNumber},"]:visible`,
  );
  if (await visibleQuestionButton.count() === 0) {
    await page.getByRole("button", { name: "Questions", exact: true }).click();
  }
  await visibleQuestionButton.click();
}

test("UCAT complete Decision Making mock supports tables, five statements, calculator and reload", async ({ page }) => {
  await page.addInitScript(({ storedGuestSpace, storedProfile }) => {
    globalThis.localStorage.setItem("admission-breaker:guest-space:v1", JSON.stringify(storedGuestSpace));
    globalThis.localStorage.setItem(
      `admission-breaker:assessment-profile:${storedGuestSpace.id}:ucat:v1`,
      JSON.stringify(storedProfile),
    );
  }, { storedGuestSpace: guestSpace, storedProfile: profile });

  const libraryResponse = await page.goto("/exams/ucat/past-papers");
  expect(libraryResponse?.ok()).toBe(true);
  const fullMockLink = page.getByRole("list", {
    name: "Full Mocks",
  }).getByRole("link", { name: "Decision Making, 35 questions · 37 minutes. Start." });
  await expect(fullMockLink).toBeVisible();
  await fullMockLink.click();

  await expect(page).toHaveURL(/\/practice\/ucat-decision-making-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "0 of 35 answered");
  await selectQuestion(page, 5);
  await expect(page.getByRole("table", { name: "Visits, follow-ups, travel cost and satisfaction" })).toBeVisible();
  await expect(page.getByText("Multiple statements")).toBeVisible();

  const statements = page.locator(".statement-response-list fieldset");
  await expect(statements).toHaveCount(5);
  for (const [index, answer] of ["Yes", "Yes", "No", "No", "No"].entries()) {
    await statements.nth(index).getByRole("radio", { name: answer }).check();
  }
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "1 of 35 answered");

  await page.getByRole("button", { name: "Basic calculator" }).click();
  const calculator = page.getByRole("region", { name: "Basic calculator" });
  await calculator.getByRole("button", { name: "7", exact: true }).click();
  await calculator.getByRole("button", { name: "Add" }).click();
  await calculator.getByRole("button", { name: "5", exact: true }).click();
  await calculator.getByRole("button", { name: "Equals" }).click();
  await expect(calculator.locator("output")).toHaveText("12");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Question 5/u })).toBeVisible();
  await expect(statements.nth(0).getByRole("radio", { name: "Yes" })).toBeChecked();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "1 of 35 answered");
  await expectNoDocumentOverflow(page);
});
