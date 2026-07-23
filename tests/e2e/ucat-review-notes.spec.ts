import { expect, test } from "@playwright/test";

const guestSpace = {
  id: "gsp_ucat-notes-e2e",
  ownerActorId: "guest_ucat-notes-e2e",
  status: "unclaimed",
  createdAt: "2026-07-19T12:00:00.000Z",
};

const profile = {
  schemaVersion: 1,
  guestSpaceId: guestSpace.id,
  examId: "ucat",
  entryCycle: "2027",
  curriculumId: "ib",
  learningStage: "year-12",
  subjectAreas: ["mathematics", "english-language", "biology", "chemistry"],
  experience: "sampled",
  weeklyTime: "5-7",
  createdAt: "2026-07-19T12:00:00.000Z",
  updatedAt: "2026-07-19T12:00:00.000Z",
};

test("UCAT Review Notes remain profile-first and usable at the current viewport", async ({ page }) => {
  await page.addInitScript(({ storedGuestSpace, storedProfile }) => {
    globalThis.localStorage.setItem(
      "admission-breaker:guest-space:v1",
      JSON.stringify(storedGuestSpace),
    );
    globalThis.localStorage.setItem(
      `admission-breaker:assessment-profile:${storedGuestSpace.id}:ucat:v1`,
      JSON.stringify(storedProfile),
    );
  }, { storedGuestSpace: guestSpace, storedProfile: profile });

  const response = await page.goto("/exams/ucat/notes/foundations");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", {
    level: 1,
    name: /UCAT 四模块与极限节奏起点复习笔记.*UCAT Four-Subtest and High-Speed Pacing Starting Review Notes/u,
  })).toBeVisible();
  await expect(page.locator(".review-notes-module")).toHaveCount(5);
  await expect(page.locator(".review-notes-units li")).toHaveCount(25);
  await expect(page.locator(".review-notes-example")).toHaveCount(5);
  await expect(page.getByRole("link", { name: "下载 A4 PDF" }))
    .toHaveAttribute("href", "/notes/ucat/ucat-four-subtest-foundations-v1.pdf");
  await expect(page.getByRole("link", { name: "进入 UCAT 在线练习" }))
    .toHaveAttribute("href", "/exams/ucat/past-papers");

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});
