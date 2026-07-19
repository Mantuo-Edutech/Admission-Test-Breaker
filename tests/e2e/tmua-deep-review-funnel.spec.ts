import { expect, test, type Page } from "@playwright/test";

const guestSpace = {
  id: "gsp_tmua-deep-review-funnel-e2e",
  ownerActorId: "guest_tmua-deep-review-funnel-e2e",
  status: "unclaimed",
  createdAt: "2026-07-19T05:30:00.000Z",
};

const profile = {
  schemaVersion: 1,
  guestSpaceId: guestSpace.id,
  exam: "TMUA",
  entryCycle: "2027",
  curriculumSystem: "caie",
  selections: [
    { qualificationId: "caie-9709-2026-2027", unitIds: ["p1"] },
  ],
  experience: "sampled",
  createdAt: "2026-07-19T05:30:00.000Z",
  updatedAt: "2026-07-19T05:30:00.000Z",
};

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("a locked deep review leads to Bingbing and preserves the result return path", async ({ page }) => {
  await page.addInitScript(({ storedGuestSpace, storedProfile }) => {
    globalThis.localStorage.setItem(
      "admission-breaker:guest-space:v1",
      JSON.stringify(storedGuestSpace),
    );
    globalThis.localStorage.setItem(
      `admission-breaker:preparation-profile:${storedGuestSpace.id}:v1`,
      JSON.stringify(storedProfile),
    );
  }, { storedGuestSpace: guestSpace, storedProfile: profile });

  await page.goto("/practice/tmua-specimen-p1");
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await page.getByRole("button", { name: "提交试卷" }).click();
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page).toHaveURL(/\/results\/ses_/u);

  await expect(page.getByText("TMUA Early Specimen Paper 1 逐题深度解析已经可用")).toBeVisible();
  const resultPath = new URL(page.url()).pathname;
  const inviteLink = page.getByRole("link", { name: "已有邀请码" });
  await expect(inviteLink).toHaveAttribute(
    "href",
    `/access?returnTo=${encodeURIComponent(resultPath)}`,
  );

  await page.getByRole("button", { name: "联系冰冰获取邀请码" }).click();
  await expect(page.getByRole("dialog", { name: /添加冰冰，获取逐题深度解析/u })).toBeVisible();
  await expect(page.getByAltText("冰冰老师微信二维码")).toBeVisible();
  await page.getByRole("button", { name: "关闭冰冰微信二维码" }).click();

  await inviteLink.click();
  await expect(page).toHaveURL(new RegExp(`/access\\?returnTo=${encodeURIComponent(resultPath)}`, "u"));
  await expect(page.getByRole("heading", { level: 1, name: "使用邀请码解锁完整内容" })).toBeVisible();
  await expectNoDocumentOverflow(page);
});
