import { expect, test } from "@playwright/test";

const guestSpace = {
  id: "gsp_lnat-notes-e2e",
  ownerActorId: "guest_lnat-notes-e2e",
  status: "unclaimed",
  createdAt: "2026-07-19T12:00:00.000Z",
};

const profile = {
  schemaVersion: 1,
  guestSpaceId: guestSpace.id,
  examId: "lnat",
  entryCycle: "2027",
  curriculumId: "a-level",
  learningStage: "year-12",
  subjectAreas: ["english-language", "humanities"],
  experience: "sampled",
  weeklyTime: "2-4",
  createdAt: "2026-07-19T12:00:00.000Z",
  updatedAt: "2026-07-19T12:00:00.000Z",
};

test("LNAT Review Notes remain profile-first and usable at the current viewport", async ({ page }) => {
  await page.addInitScript(({ storedGuestSpace, storedProfile }) => {
    globalThis.localStorage.setItem(
      "admission-breaker:guest-space:v1",
      JSON.stringify(storedGuestSpace),
    );
    globalThis.localStorage.setItem(
      `admission-breaker:assessment-profile:${storedGuestSpace.id}:lnat:v1`,
      JSON.stringify(storedProfile),
    );
  }, { storedGuestSpace: guestSpace, storedProfile: profile });

  const response = await page.goto("/exams/lnat/notes/foundations");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", {
    level: 1,
    name: /LNAT 论证阅读与写作起点复习笔记.*LNAT Argument Reading and Writing Starting Review Notes/u,
  })).toBeVisible();
  await expect(page.locator(".review-notes-module")).toHaveCount(4);
  await expect(page.locator(".review-notes-units li")).toHaveCount(21);
  await expect(page.locator(".review-notes-example")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "下载 A4 PDF" }))
    .toHaveAttribute("href", "/notes/lnat/lnat-reading-writing-foundations-v1.pdf");
  await expect(page.getByRole("link", { name: "进入 LNAT 在线练习" }))
    .toHaveAttribute("href", "/exams/lnat/past-papers");

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});
