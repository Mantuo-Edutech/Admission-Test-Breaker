import { expect, test, type Page } from "@playwright/test";

const guestSpace = {
  id: "gsp_lnat-full-mock-e2e",
  ownerActorId: "guest_lnat-full-mock-e2e",
  status: "unclaimed",
  createdAt: "2026-07-19T20:00:00.000Z",
};

const profile = {
  schemaVersion: 1,
  guestSpaceId: guestSpace.id,
  examId: "lnat",
  entryCycle: "2027",
  curriculumId: "ib",
  learningStage: "year-12",
  subjectAreas: ["english-language", "humanities"],
  experience: "sampled",
  weeklyTime: "2-4",
  createdAt: "2026-07-19T20:00:00.000Z",
  updatedAt: "2026-07-19T20:00:00.000Z",
};

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("LNAT complete Section A mock opens natively and preserves the first response", async ({ page }) => {
  await page.addInitScript(({ storedGuestSpace, storedProfile }) => {
    globalThis.localStorage.setItem("admission-breaker:guest-space:v1", JSON.stringify(storedGuestSpace));
    globalThis.localStorage.setItem(
      `admission-breaker:assessment-profile:${storedGuestSpace.id}:lnat:v1`,
      JSON.stringify(storedProfile),
    );
  }, { storedGuestSpace: guestSpace, storedProfile: profile });

  const libraryResponse = await page.goto("/exams/lnat/past-papers");
  expect(libraryResponse?.ok()).toBe(true);
  const fullMockLink = page.getByRole("region", {
    name: /LNAT Section A Starter & Complete-Structure Mock/u,
  }).getByRole("link", { name: /^02\s*Section A Full Mock\s*完整结构模考/u });
  await expect(fullMockLink).toBeVisible();
  await fullMockLink.click();

  await expect(page).toHaveURL(/\/practice\/lnat-section-a-full-mock-v1$/u);
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quiet Carriages and Public Rules" })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 0 / 42");
  await page.getByRole("radio", { name: "选项 B" }).check();
  await page.reload();
  await expect(page.getByRole("radio", { name: "选项 B" })).toBeChecked();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "已作答 1 / 42");
  await expectNoDocumentOverflow(page);
});
