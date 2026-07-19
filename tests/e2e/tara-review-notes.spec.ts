import { expect, test } from "@playwright/test";

const guestSpace = {
  id: "gsp_tara-notes-e2e",
  ownerActorId: "guest_tara-notes-e2e",
  status: "unclaimed",
  createdAt: "2026-07-19T12:00:00.000Z",
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
  createdAt: "2026-07-19T12:00:00.000Z",
  updatedAt: "2026-07-19T12:00:00.000Z",
};

test("TARA Review Notes remain profile-first and usable at the current viewport", async ({ page }) => {
  await page.addInitScript(({ storedGuestSpace, storedProfile }) => {
    globalThis.localStorage.setItem(
      "admission-breaker:guest-space:v1",
      JSON.stringify(storedGuestSpace),
    );
    globalThis.localStorage.setItem(
      `admission-breaker:assessment-profile:${storedGuestSpace.id}:tara:v1`,
      JSON.stringify(storedProfile),
    );
  }, { storedGuestSpace: guestSpace, storedProfile: profile });

  const response = await page.goto("/exams/tara/notes/foundations");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", {
    level: 1,
    name: /TARA 推理与写作起点复习笔记.*TARA Reasoning and Writing Starting Review Notes/u,
  })).toBeVisible();
  await expect(page.locator(".review-notes-module")).toHaveCount(4);
  await expect(page.locator(".review-notes-units li")).toHaveCount(21);
  await expect(page.locator(".review-notes-example")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "下载 A4 PDF" }))
    .toHaveAttribute("href", "/notes/tara/tara-reasoning-writing-foundations-v1.pdf");
  await expect(page.getByRole("link", { name: "进入 TARA 在线练习" }))
    .toHaveAttribute("href", "/exams/tara/past-papers");

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});
