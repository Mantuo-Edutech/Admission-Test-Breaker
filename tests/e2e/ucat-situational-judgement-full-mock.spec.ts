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
  const visibleQuestionButton = page.locator(`button[aria-label^="第 ${questionNumber} 题"]:visible`);
  if (await visibleQuestionButton.count() === 0) {
    await page.getByRole("button", { name: "题目", exact: true }).click();
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
    name: "完整练习 Full-length practice",
  }).getByRole("link", { name: /Situational Judgement 情境判断.*69 题.*开始练习/u });
  await expect(fullMockLink).toBeVisible();
  await fullMockLink.click();

  await expect(page).toHaveURL(/\/practice\/ucat-situational-judgement-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A mismatched label" })).toBeVisible();
  await expect(page.getByText("情境判断等级题")).toBeVisible();
  await page.getByRole("radio", { name: "选项 B" }).check();

  await selectQuestion(page, 61);
  await expect(page.getByRole("heading", { name: "A distressed teammate" })).toBeVisible();
  await expect(page.getByText("最合适 / 最不合适")).toBeVisible();
  await page.getByRole("radio", { name: "最合适" }).nth(0).check();
  await page.getByRole("radio", { name: "最不合适" }).nth(2).check();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 2 / 69");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "第 61 题" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "最合适" }).nth(0)).toBeChecked();
  await expect(page.getByRole("radio", { name: "最不合适" }).nth(2)).toBeChecked();

  await selectQuestion(page, 69);
  await expect(page.getByRole("heading", { name: "A shared revision file" })).toBeVisible();
  await selectQuestion(page, 1);
  await expect(page.getByRole("radio", { name: "选项 B" })).toBeChecked();
  await expectNoDocumentOverflow(page);
});
