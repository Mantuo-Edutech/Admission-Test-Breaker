import { expect, test, type Page } from "@playwright/test";

const esatPlan = {
  schemaVersion: 1,
  programmeIds: ["imperial-h401"],
  moduleIds: ["mathematics-1", "physics", "mathematics-2"],
  entryCycle: "2027",
  curriculumId: "ap",
  courseIds: ["ap-precalculus", "ap-calculus-bc", "ap-physics-1"],
  updatedAt: "2026-07-27T03:00:00.000Z",
};

const taraGuestSpace = {
  id: "gsp_tara-historic-e2e",
  ownerActorId: "guest_tara-historic-e2e",
  status: "unclaimed",
  createdAt: "2026-07-27T03:00:00.000Z",
};

const taraProfile = {
  schemaVersion: 1,
  guestSpaceId: taraGuestSpace.id,
  examId: "tara",
  entryCycle: "2027",
  curriculumId: "ib",
  learningStage: "year-12",
  subjectAreas: ["mathematics", "english-language", "humanities"],
  experience: "sampled",
  weeklyTime: "2-4",
  createdAt: "2026-07-27T03:00:00.000Z",
  updatedAt: "2026-07-27T03:00:00.000Z",
};

async function expectNativeQuestion(page: Page, total: number) {
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute(
    "aria-label",
    `已作答 0 / ${total}`,
  );
  const image = page.locator(".question-figure img").first();
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", /\/questions\/.+\/q01\.webp$/u);
  await expect.poll(async () => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await expect(page.getByRole("radio", { name: "选项 A" })).toBeVisible();
  await page.getByRole("radio", { name: "选项 A" }).check();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute(
    "aria-label",
    `已作答 1 / ${total}`,
  );
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("ESAT historic module practice opens as a native online question", async ({ page }) => {
  await page.addInitScript((storedPlan) => {
    globalThis.localStorage.setItem(
      "admission-test-breaker.esat-plan.v1",
      JSON.stringify(storedPlan),
    );
  }, esatPlan);

  await page.goto("/exams/esat/past-papers");
  await expect(page.getByText("12 套主练习")).toBeVisible();
  const link = page.getByRole("link", {
    name: /NSAA 2023.*数学模块练习.*20 题.*开始练习/u,
  });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/practice\/esat-nsaa-2023-mathematics-1$/u);
  await expectNativeQuestion(page, 20);
});

test("TARA historic reasoning practice opens as a native online question", async ({ page }) => {
  await page.addInitScript(({ storedGuestSpace, storedProfile }) => {
    globalThis.localStorage.setItem(
      "admission-breaker:guest-space:v1",
      JSON.stringify(storedGuestSpace),
    );
    globalThis.localStorage.setItem(
      `admission-breaker:assessment-profile:${storedGuestSpace.id}:tara:v1`,
      JSON.stringify(storedProfile),
    );
  }, { storedGuestSpace: taraGuestSpace, storedProfile: taraProfile });

  await page.goto("/exams/tara/past-papers");
  await expect(page.getByText("7 套主练习")).toBeVisible();
  const link = page.getByRole("link", {
    name: /TSA 2023.*批判思维与问题解决.*50 题.*开始练习/u,
  });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/practice\/tara-tsa-2023-mixed-reasoning$/u);
  await expectNativeQuestion(page, 50);
});
