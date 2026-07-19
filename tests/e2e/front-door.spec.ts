import { expect, test, type Page } from "@playwright/test";

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth, `document width ${overflow.scrollWidth} should fit viewport ${overflow.clientWidth}`)
    .toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("the Mantou front door explains the product and exposes all five exams", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/满托入学考试练习场.*TMUA.*UCAT/u);
  await expect(page.getByRole("heading", { level: 1, name: "不再为升学考试而焦虑" })).toBeVisible();
  await expect(page.getByRole("img", { name: "满托" })).toBeVisible();
  await expect(page.locator(".exam-entry")).toHaveCount(5);
  for (const exam of ["tmua", "esat", "tara", "lnat", "ucat"]) {
    await expect(page.locator(`a.exam-entry[href="/exams/${exam}"]`)).toBeVisible();
  }
  await expect(page.getByRole("list", { name: "完整备考路径" })).toContainText("选择考试");
  await expect(page.getByRole("list", { name: "完整备考路径" })).toContainText("跟踪准备进度");
  await expectNoDocumentOverflow(page);
});
