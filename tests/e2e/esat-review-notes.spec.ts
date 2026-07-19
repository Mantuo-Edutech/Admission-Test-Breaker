import { expect, test } from "@playwright/test";

const plan = {
  schemaVersion: 1,
  programmeIds: ["imperial-h401"],
  moduleIds: ["mathematics-1", "physics", "mathematics-2"],
  entryCycle: "2027",
  curriculumId: "ap",
  courseIds: ["ap-precalculus", "ap-calculus-bc", "ap-physics-1"],
  updatedAt: "2026-07-19T08:00:00.000Z",
};

const sciencePlan = {
  schemaVersion: 1,
  programmeIds: ["imperial-c700"],
  moduleIds: ["mathematics-1", "chemistry", "biology"],
  entryCycle: "2027",
  curriculumId: "ap",
  courseIds: ["ap-precalculus", "ap-chemistry", "ap-biology"],
  updatedAt: "2026-07-19T10:00:00.000Z",
};

test("ESAT Mathematics Review Notes remain usable at the current viewport", async ({ page }) => {
  await page.addInitScript((storedPlan) => {
    globalThis.localStorage.setItem(
      "admission-test-breaker.esat-plan.v1",
      JSON.stringify(storedPlan),
    );
  }, plan);

  const response = await page.goto("/exams/esat/notes/mathematics");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", {
    level: 1,
    name: /ESAT 数学起点复习笔记.*ESAT Mathematics Starting Review Notes/u,
  })).toBeVisible();
  await expect(page.locator(".review-notes-module")).toHaveCount(2);
  await expect(page.locator(".review-notes-units li")).toHaveCount(15);
  await expect(page.locator(".review-notes-example")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "下载 A4 PDF" }))
    .toHaveAttribute("href", "/notes/esat/esat-mathematics-foundations-v1.pdf");
  await expect(page.getByRole("link", { name: /进入 ESAT 数学在线练习/u }))
    .toHaveAttribute("href", "/exams/esat/past-papers");

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});

test("ESAT Science Review Notes filter modules and remain usable at the current viewport", async ({ page }) => {
  await page.addInitScript((storedPlan) => {
    globalThis.localStorage.setItem(
      "admission-test-breaker.esat-plan.v1",
      JSON.stringify(storedPlan),
    );
  }, sciencePlan);

  const response = await page.goto("/exams/esat/notes/sciences");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", {
    level: 1,
    name: /ESAT 理科模块起点复习笔记.*ESAT Science Modules Starting Review Notes/u,
  })).toBeVisible();
  await expect(page.locator(".review-notes-module")).toHaveCount(2);
  await expect(page.locator(".review-notes-units li")).toHaveCount(28);
  await expect(page.locator(".review-notes-example")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "下载 A4 PDF" }))
    .toHaveAttribute("href", "/notes/esat/esat-sciences-foundations-v1.pdf");
  await expect(page.getByRole("link", { name: /进入 ESAT 理科模块在线练习/u }))
    .toHaveAttribute("href", "/exams/esat/past-papers");

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});
