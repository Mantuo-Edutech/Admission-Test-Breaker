import { expect, test, type Page } from "@playwright/test";
import { publicContentProducts } from "../../src/features/library/content-product-registry.js";

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("deployed public journey exposes five real exam spaces and account entry", async ({ page }) => {
  const homepage = await page.goto("/");
  expect(homepage?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "不再为升学考试而焦虑" })).toBeVisible();
  await expect(page.locator("a.exam-entry")).toHaveCount(5);
  await expectNoDocumentOverflow(page);

  for (const exam of ["tmua", "esat", "tara", "lnat", "ucat"]) {
    const response = await page.goto(`/exams/${exam}`);
    expect(response?.ok(), `${exam} public page should return 2xx`).toBe(true);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("body")).toContainText(exam.toUpperCase());
    await expectNoDocumentOverflow(page);
  }

  const library = await page.goto("/library");
  expect(library?.ok()).toBe(true);
  const productRegion = page.getByRole("region", { name: "可用题库与学习资料" });
  await expect(productRegion.getByRole("article")).toHaveCount(publicContentProducts().length);
  await expect(productRegion.getByRole("heading", {
    name: /TMUA 30 分钟起点能力诊断/u,
  })).toBeVisible();
  await expect(productRegion.getByRole("heading", {
    name: /TMUA Early Specimen Paper 1 逐题深度解析/u,
  })).toBeVisible();
  await expect(productRegion.getByRole("heading", { name: /ESAT 中国学生复习笔记/u }))
    .toHaveCount(0);
  await expect(productRegion.getByRole("heading", { name: /ESAT 数学起点复习笔记/u }))
    .toBeVisible();
  await expect(productRegion.getByRole("heading", { name: /ESAT 理科模块起点复习笔记/u }))
    .toBeVisible();
  await expect(productRegion.getByRole("heading", { name: /TARA 推理与写作起点复习笔记/u }))
    .toBeVisible();
  await expect(productRegion.getByRole("heading", { name: /LNAT .*起点复习笔记/u }))
    .toBeVisible();
  await expect(productRegion.getByRole("heading", { name: /UCAT .*起点复习笔记/u }))
    .toBeVisible();
  await expectNoDocumentOverflow(page);

  const login = await page.goto("/login");
  expect(login?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "继续你的训练" })).toBeVisible();
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();

  const register = await page.goto("/register");
  expect(register?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "请先输入邀请码" })).toBeVisible();
  await expect(page.getByRole("link", { name: "验证邀请码" })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("deployed TMUA AP profile produces coverage and opens a native paper", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "deployed-desktop", "Run the write-free Guest journey once");

  const archive = await page.goto("/exams/tmua/past-papers");
  expect(archive?.ok()).toBe(true);
  await expect(page.getByRole("list", { name: "历年真题 18 papers" }).getByRole("listitem"))
    .toHaveCount(18);
  await expect(page.getByRole("link", { name: "Early specimen Paper 1，20 题，开始练习" }))
    .toBeVisible();

  await page.getByRole("link", { name: "Early specimen Paper 1，20 题，开始练习" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "请先填写课程信息" })).toBeVisible();
  await page.getByRole("link", { name: /填写课程信息/u }).click();

  const apSystem = page.getByRole("radio", { name: /AP \/ US Curriculum/u });
  await apSystem.click();
  await expect(apSystem).toBeChecked();
  const apPrecalculus = page.getByRole("checkbox", { name: /AP Precalculus/u });
  await apPrecalculus.click();
  await expect(apPrecalculus).toBeChecked();
  const modules = page.locator('.profile-unit-grid[aria-label*="AP Precalculus"]');
  await expect(modules).toBeVisible();
  await modules.getByRole("checkbox", { name: /Unit 1.*多项式与有理函数/u }).check();
  await modules.getByRole("checkbox", { name: /Unit 2.*指数与对数函数/u }).check();
  await page.getByRole("radio", { name: /做过少量题/u }).check();
  await page.getByRole("button", { name: "保存并查看知识覆盖" }).click();

  await expect(page).toHaveURL(/\/exams\/tmua\/coverage$/u);
  await expect(page.getByRole("heading", { level: 1, name: /课程覆盖与补学建议/u })).toBeVisible();
  await expect(page.getByText("AP Precalculus · AP 预备微积分", { exact: false }).first()).toBeVisible();

  await page.goto("/exams/tmua/past-papers");
  await page.getByRole("link", { name: "Early specimen Paper 1，20 题，开始练习" }).click();
  await expect(page).toHaveURL(/\/practice\/tmua-specimen-p1$/u);
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.getByLabel("已作答 0 / 20")).toBeVisible();
  await expectNoDocumentOverflow(page);
});
