import { expect, test, type Page } from "@playwright/test";

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth, `document width ${overflow.scrollWidth} should fit viewport ${overflow.clientWidth}`)
    .toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function submitCurrentPractice(page: Page) {
  await page.getByRole("button", { name: "提交试卷" }).click();
  await expect(page.getByRole("dialog", { name: "准备提交这份试卷？" })).toBeVisible();
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page).toHaveURL(/\/results\//u);
  await expect(page.getByRole("heading", { level: 1, name: "本次练习完成" })).toBeVisible();
}

async function expectLearningRecord(page: Page) {
  await page.goto("/exams/ucat/record");
  await expect(page.getByRole("heading", { level: 1, name: /UCAT 学习记录/u })).toBeVisible();
  await expect(page.getByRole("region", { name: "UCAT 学习记录概览" })).toContainText("完成 1 次");
  await expect(page.getByRole("heading", { level: 2, name: "最近练习" })).toBeVisible();
  await expect(page.getByRole("link", { name: "查看本次结果" })).toBeVisible();
  await expect(page.locator(".learning-record-topics h3").first()).toContainText(" · ");
  await expect(page.locator(".learning-record-topics h3").first()).not.toContainText(/^ucat-/u);
  await expectNoDocumentOverflow(page);
}

async function completeUcatProfile(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "请先填写 UCAT 背景信息" })).toBeVisible();
  await page.getByRole("link", { name: "填写 UCAT 背景信息" }).click();
  await page.getByRole("radio", { name: /A-Level \/ IAL/u }).check();
  await page.getByRole("radio", { name: "Year 12" }).check();
  await page.getByRole("checkbox", { name: "Mathematics 数学", exact: true }).check();
  await page.getByRole("radio", { name: "看过或做过少量样题" }).check();
  await page.getByRole("radio", { name: "每周 2–4 小时" }).check();
  await page.getByRole("button", { name: "保存并查看 UCAT 起点定位" }).click();
  await expect(page).toHaveURL(/\/exams\/ucat\/preparation$/u);
  await expect(page.getByRole("heading", { level: 1, name: /你的 UCAT 起点定位/u })).toBeVisible();
  await expect(page.getByText("集合、条件与演绎逻辑 · Sets, conditions and deduction")).toBeVisible();
  await page.getByRole("link", { name: "进入 UCAT 免费在线练习", exact: true }).first().click();
  await expect(page).toHaveURL(/\/exams\/ucat\/past-papers$/u);
}

test("desktop: Decision Making completes, reloads and scores a five-statement set", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop specialist journey");

  await page.goto("/");
  await page.locator('a.exam-entry[href="/exams/ucat"]').click();
  await page.getByRole("link", { name: "查看免费在线练习", exact: true }).click();
  await page.getByRole("link", { name: /Decision Making 决策判断.*8 题.*开始练习/u }).click();
  await completeUcatProfile(page);
  await page.getByRole("link", { name: /Decision Making 决策判断.*8 题.*开始练习/u }).click();
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();

  await page.getByRole("button", { name: /第 4 题，未作答/u }).click();
  await expect(page.getByText("多陈述判断题")).toBeVisible();
  const statements = page.locator(".statement-response-list fieldset");
  await expect(statements).toHaveCount(5);
  for (const [index, answer] of ["Yes", "Yes", "No", "No", "Yes"].entries()) {
    await statements.nth(index).getByRole("radio", { name: answer }).check();
  }
  await expect(page.getByLabel("已作答 1 / 8")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "第 4 题" })).toBeVisible();
  await expect(page.getByLabel("已作答 1 / 8")).toBeVisible();
  await expect(statements.nth(0).getByRole("radio", { name: "Yes" })).toBeChecked();
  await expectNoDocumentOverflow(page);

  await submitCurrentPractice(page);
  await expect(page.getByLabel("得分 2 / 10")).toBeVisible();
  await expect(page.getByText("部分得分", { exact: false })).not.toBeVisible();
  await expectLearningRecord(page);
});

test("iPad: Quantitative Reasoning keeps the table and calculator usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad-chromium", "Tablet quantitative journey");

  await page.goto("/practice/ucat-quantitative-reasoning-starter-v1");
  await completeUcatProfile(page);
  await page.getByRole("link", { name: /Quantitative Reasoning 数量推理.*10 题.*开始练习/u }).click();
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Booked appointments and consultation time" })).toBeVisible();
  await page.getByRole("button", { name: "基础计算器" }).click();
  const calculator = page.getByRole("region", { name: "基础计算器" });
  await calculator.getByRole("button", { name: "7", exact: true }).click();
  await calculator.getByRole("button", { name: "加上" }).click();
  await calculator.getByRole("button", { name: "5", exact: true }).click();
  await calculator.getByRole("button", { name: "等于" }).click();
  await expect(calculator.locator("output")).toHaveText("12");
  await page.getByRole("radio", { name: "选项 B" }).check();
  await expect(page.getByLabel("已作答 1 / 10")).toContainText("1 / 10");
  await expectNoDocumentOverflow(page);

  await submitCurrentPractice(page);
  await expect(page.getByLabel("得分 1 / 10")).toBeVisible();
  await expectLearningRecord(page);
});

test("phone: Situational Judgement records adjacent partial credit", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone-chromium", "Phone SJT journey");

  await page.goto("/practice/ucat-situational-judgement-starter-v1");
  await completeUcatProfile(page);
  await page.getByRole("link", { name: /Situational Judgement 情境判断.*10 题.*开始练习/u }).click();
  await expect(page.getByRole("heading", { level: 1, name: "第 1 题" })).toBeVisible();
  await expect(page.getByText("情境判断等级题")).toBeVisible();
  await page.getByRole("radio", { name: "选项 B" }).check();
  await expect(page.getByLabel("已作答 1 / 10")).toContainText("1 / 10");
  await expect(page.getByRole("button", { name: "题目" })).toBeVisible();
  await expectNoDocumentOverflow(page);

  await submitCurrentPractice(page);
  await expect(page.getByLabel("得分 0.5 / 10")).toBeVisible();
  await expect(page.getByText(/部分得分/u).first()).toBeVisible();
  await expectLearningRecord(page);
});
