import { expect, test, type Page } from "@playwright/test";

const guestSpace = {
  id: "gsp_tara-full-mock-e2e",
  ownerActorId: "guest_tara-full-mock-e2e",
  status: "unclaimed",
  createdAt: "2026-07-19T18:00:00.000Z",
};

const profile = {
  schemaVersion: 1,
  guestSpaceId: guestSpace.id,
  examId: "tara",
  entryCycle: "2027",
  curriculumId: "ib",
  learningStage: "year-12",
  subjectAreas: ["mathematics", "english-language", "humanities"],
  experience: "sampled",
  weeklyTime: "2-4",
  createdAt: "2026-07-19T18:00:00.000Z",
  updatedAt: "2026-07-19T18:00:00.000Z",
};

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("both TARA full reasoning modules open natively and persist at the current viewport", async ({ page }) => {
  await page.addInitScript(({ storedGuestSpace, storedProfile }) => {
    globalThis.localStorage.setItem("admission-breaker:guest-space:v1", JSON.stringify(storedGuestSpace));
    globalThis.localStorage.setItem(
      `admission-breaker:assessment-profile:${storedGuestSpace.id}:tara:v1`,
      JSON.stringify(storedProfile),
    );
  }, { storedGuestSpace: guestSpace, storedProfile: profile });

  const libraryResponse = await page.goto("/exams/tara/past-papers");
  expect(libraryResponse?.ok()).toBe(true);
  const fullMockLinks = page.getByRole("region", { name: /TARA Reasoning Starter & Full-Length Mocks/u });
  const criticalThinkingLink = fullMockLinks.getByRole("link", {
    name: /^02\s*Critical Thinking\s*完整模考/u,
  });
  const problemSolvingLink = fullMockLinks.getByRole("link", {
    name: /^03\s*Problem Solving\s*完整模考/u,
  });
  await expect(criticalThinkingLink).toBeVisible();
  await expect(problemSolvingLink).toBeVisible();

  await criticalThinkingLink.click();
  await expect(page).toHaveURL(/\/practice\/tara-critical-thinking-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 0 / 22");
  await page.getByRole("radio", { name: "选项 D" }).check();
  await page.reload();
  await expect(page.getByRole("radio", { name: "选项 D" })).toBeChecked();
  await expectNoDocumentOverflow(page);

  await page.goto("/exams/tara/past-papers");
  await page.getByRole("region", { name: /TARA Reasoning Starter & Full-Length Mocks/u })
    .getByRole("link", { name: /^03\s*Problem Solving\s*完整模考/u })
    .click();
  await expect(page).toHaveURL(/\/practice\/tara-problem-solving-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 0 / 22");
  await page.getByRole("radio", { name: "选项 C" }).check();
  await page.reload();
  await expect(page.getByRole("radio", { name: "选项 C" })).toBeChecked();
  await expectNoDocumentOverflow(page);
});
