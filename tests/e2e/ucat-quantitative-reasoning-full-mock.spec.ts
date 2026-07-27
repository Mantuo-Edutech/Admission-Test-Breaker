import { expect, test, type Page } from "@playwright/test";

const guestSpace = {
  id: "gsp_ucat-qr-full-mock-e2e",
  ownerActorId: "guest_ucat-qr-full-mock-e2e",
  status: "unclaimed",
  createdAt: "2026-07-19T23:00:00.000Z",
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
  createdAt: "2026-07-19T23:00:00.000Z",
  updatedAt: "2026-07-19T23:00:00.000Z",
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

test("UCAT complete Quantitative Reasoning mock supports nine datasets, calculator and reload", async ({ page }) => {
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
  }).getByRole("link", { name: "Quantitative Reasoning, 36 questions · 26 minutes. Start." });
  await expect(fullMockLink).toBeVisible();
  await fullMockLink.click();

  await expect(page).toHaveURL(/\/practice\/ucat-quantitative-reasoning-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();
  await expect(page.getByRole("table", {
    name: "Bookings, expected attendance and consultation capacity",
  })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "0 of 36 answered");
  await page.getByRole("radio", { name: "Option B" }).check();

  await page.getByRole("button", { name: "Basic calculator" }).click();
  const calculator = page.getByRole("region", { name: "Basic calculator" });
  await calculator.getByRole("button", { name: "8", exact: true }).click();
  await calculator.getByRole("button", { name: "Multiply" }).click();
  await calculator.getByRole("button", { name: "5", exact: true }).click();
  await calculator.getByRole("button", { name: "Equals" }).click();
  await expect(calculator.locator("output")).toHaveText("40");

  await selectQuestion(page, 36);
  await expect(page.getByRole("table", { name: "District screening outcomes and cost" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Question 36/u })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "1 of 36 answered");
  await selectQuestion(page, 1);
  await expect(page.getByRole("radio", { name: "Option B" })).toBeChecked();
  await expectNoDocumentOverflow(page);
});
