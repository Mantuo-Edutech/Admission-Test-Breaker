import { expect, test } from "@playwright/test";

test("TMUA paper library keeps the next action in view at every supported viewport", async ({ page }) => {
  const response = await page.goto("/exams/tmua/past-papers");
  expect(response?.ok()).toBe(true);

  await expect(page.getByRole("heading", {
    level: 1,
    name: /选择一套真题.*Choose a past paper/u,
  })).toBeVisible();

  const papers = page.getByRole("list", { name: "历年真题 18 papers" });
  await expect(papers.getByRole("listitem")).toHaveCount(18);
  await expect(papers.getByRole("link", {
    name: "Early specimen Paper 1，20 题，开始练习",
  })).toHaveAttribute("href", "/practice/tmua-specimen-p1");
  await expect(papers.getByRole("heading", { name: "2016 Practice" })).toHaveCount(0);
  await expect(page.getByText(/审核|校验|转换|归档|资料状态/u)).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const firstCard = document.querySelector<HTMLElement>(".practice-entry-grid a");
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      firstCardBottom: firstCard?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
      viewportHeight: globalThis.innerHeight,
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.firstCardBottom).toBeLessThanOrEqual(layout.viewportHeight);
});
