import { expect, test, type Page } from "@playwright/test";

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth, `document width ${overflow.scrollWidth} should fit viewport ${overflow.clientWidth}`)
    .toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("the Mantou front door explains the product and exposes all five exams", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page).toHaveTitle("满托｜英国入学考试练习与诊断");
  await expect(page.getByRole("heading", { level: 1, name: "不再为升学考试而焦虑" })).toBeVisible();
  await expect(page.getByRole("img", { name: "满托" })).toBeVisible();
  await expect(page.locator(".exam-entry")).toHaveCount(5);
  for (const exam of ["tmua", "esat", "tara", "lnat", "ucat"]) {
    await expect(page.locator(`a.exam-entry[href="/exams/${exam}"]`)).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "账号" })).toHaveAttribute("href", "/account");
  await expect(page.getByRole("link", { name: "题库与资料" })).toHaveCount(0);
  await expect(page.getByText("第一步", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "完整备考路径" })).toHaveCount(0);
  if (testInfo.project.name === "desktop-chromium") {
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    for (const card of await page.locator("a.exam-entry").all()) {
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
    }
  }
  await expectNoDocumentOverflow(page);
});
