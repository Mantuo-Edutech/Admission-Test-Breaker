import { expect, test, type Page } from "@playwright/test";

const guestSpace = {
  id: "gsp_ucat-sjt-full-mock-e2e",
  ownerActorId: "guest_ucat-sjt-full-mock-e2e",
  status: "unclaimed",
  createdAt: "2026-07-19T23:30:00.000Z",
};

const profile = {
  schemaVersion: 1,
  guestSpaceId: guestSpace.id,
  examId: "ucat",
  entryCycle: "2027",
  curriculumId: "a-level",
  learningStage: "year-12",
  subjectAreas: ["biology", "chemistry"],
  experience: "sampled",
  weeklyTime: "2-4",
  createdAt: "2026-07-19T23:30:00.000Z",
  updatedAt: "2026-07-19T23:30:00.000Z",
};

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function selectQuestion(page: Page, questionNumber: number) {
  const visibleQuestionButton = page.locator(`button[aria-label^="Question ${questionNumber},"]:visible`);
  if (await visibleQuestionButton.count() === 0) {
    await page.getByRole("button", { name: "Questions", exact: true }).click();
  }
  await visibleQuestionButton.click();
}

test("UCAT complete Situational Judgement mock supports rating and most/least responses", async ({ page }) => {
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
  }).getByRole("link", { name: "Situational Judgement, 69 questions · 26 minutes. Start." });
  await expect(fullMockLink).toBeVisible();
  await fullMockLink.click();

  await expect(page).toHaveURL(/\/practice\/ucat-situational-judgement-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A mismatched label" })).toBeVisible();
  await expect(page.getByText("Situational judgement", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Option B" }).check();

  await selectQuestion(page, 61);
  await expect(page.getByRole("heading", { name: "A distressed teammate" })).toBeVisible();
  await expect(page.getByText("Most / least appropriate")).toBeVisible();
  await page.getByRole("radio", { name: "Most" }).nth(0).check();
  await page.getByRole("radio", { name: "Least" }).nth(2).check();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "2 of 69 answered");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Question 61/u })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Most" }).nth(0)).toBeChecked();
  await expect(page.getByRole("radio", { name: "Least" }).nth(2)).toBeChecked();

  await selectQuestion(page, 69);
  await expect(page.getByRole("heading", { name: "A shared revision file" })).toBeVisible();
  await selectQuestion(page, 1);
  await expect(page.getByRole("radio", { name: "Option B" })).toBeChecked();
  await expectNoDocumentOverflow(page);
});
