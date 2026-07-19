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
    `button[aria-label^="第 ${questionNumber} 题"]:visible`,
  );
  if (await visibleQuestionButton.count() === 0) {
    await page.getByRole("button", { name: "题目", exact: true }).click();
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
  const fullMockLink = page.getByRole("region", {
    name: /Four UCAT Starters & Four Full Mocks/u,
  }).getByRole("link", { name: /^06\s*Quantitative Reasoning Full Mock\s*完整模考/u });
  await expect(fullMockLink).toBeVisible();
  await fullMockLink.click();

  await expect(page).toHaveURL(/\/practice\/ucat-quantitative-reasoning-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.getByRole("table", {
    name: "Bookings, expected attendance and consultation capacity",
  })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 0 / 36");
  await page.getByRole("radio", { name: "选项 B" }).check();

  await page.getByRole("button", { name: "基础计算器" }).click();
  const calculator = page.getByRole("region", { name: "基础计算器" });
  await calculator.getByRole("button", { name: "8", exact: true }).click();
  await calculator.getByRole("button", { name: "乘以" }).click();
  await calculator.getByRole("button", { name: "5", exact: true }).click();
  await calculator.getByRole("button", { name: "等于" }).click();
  await expect(calculator.locator("output")).toHaveText("40");

  await selectQuestion(page, 36);
  await expect(page.getByRole("table", { name: "District screening outcomes and cost" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "第 36 题" })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 1 / 36");
  await selectQuestion(page, 1);
  await expect(page.getByRole("radio", { name: "选项 B" })).toBeChecked();
  await expectNoDocumentOverflow(page);
});
