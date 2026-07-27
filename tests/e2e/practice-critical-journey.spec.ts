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
  await page.getByRole("button", { name: "Submit paper" }).click();
  await expect(page.getByRole("dialog", { name: "Submit this paper?" })).toBeVisible();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/\/results\//u);
  await expect(page.getByRole("heading", { level: 1, name: /Practice complete/u })).toBeVisible();
}

async function expectLearningRecord(page: Page) {
  await page.goto("/exams/ucat/record");
  await expect(page.getByRole("heading", { level: 1, name: /UCAT Learning Record/u })).toBeVisible();
  await expect(page.getByRole("region", { name: "UCAT learning record summary" })).toContainText("1 completed");
  await expect(page.getByRole("heading", { level: 2, name: /Recent sessions/u })).toBeVisible();
  await expect(page.getByRole("link", { name: "View result" })).toBeVisible();
  await expect(page.locator(".learning-record-topics h3").first()).toContainText(" · ");
  await expect(page.locator(".learning-record-topics h3").first()).not.toContainText(/^ucat-/u);
  await expectNoDocumentOverflow(page);
}

async function completeUcatProfile(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: /Complete your UCAT profile first/u })).toBeVisible();
  await page.getByRole("link", { name: /Complete UCAT profile/u }).click();
  await page.getByRole("radio", { name: /A-Level \/ IAL/u }).check();
  await page.getByRole("radio", { name: "Year 12" }).check();
  await page.getByRole("checkbox", { name: /^Mathematics/u }).check();
  await page.getByRole("radio", { name: "A few sample questions" }).check();
  await page.getByRole("radio", { name: "2–4 hours per week" }).check();
  await page.getByRole("button", { name: /Save and view UCAT coverage/u }).click();
  await expect(page).toHaveURL(/\/exams\/ucat\/preparation$/u);
  await expect(page.getByRole("heading", { level: 1, name: /Your UCAT starting point/u })).toBeVisible();
  await expect(page.getByText(/Sets, conditions and deduction/u)).toBeVisible();
  await page.getByRole("link", { name: "Open UCAT online practice", exact: true }).first().click();
  await expect(page).toHaveURL(/\/exams\/ucat\/past-papers$/u);
}

test("desktop: the public Decision Making full mock completes and preserves a five-statement response", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop specialist journey");

  await page.goto("/practice/ucat-decision-making-full-mock-v1");
  await completeUcatProfile(page);
  await page.getByRole("link", { name: "Decision Making, 35 questions · 37 minutes. Start." }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();

  await page.getByRole("button", { name: /Question 5, unanswered/u }).click();
  await expect(page.getByText("Multiple statements")).toBeVisible();
  const statements = page.locator(".statement-response-list fieldset");
  await expect(statements).toHaveCount(5);
  for (const [index, answer] of ["Yes", "Yes", "No", "No", "No"].entries()) {
    await statements.nth(index).getByRole("radio", { name: answer }).check();
  }
  await expect(page.getByLabel("1 of 35 answered")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Question 5/u })).toBeVisible();
  await expect(page.getByLabel("1 of 35 answered")).toBeVisible();
  await expect(statements.nth(0).getByRole("radio", { name: "Yes" })).toBeChecked();
  await expectNoDocumentOverflow(page);

  await submitCurrentPractice(page);
  await expect(page.locator(".score-seal")).toHaveAttribute("aria-label", /Score 2 \/ \d+/u);
  await expectLearningRecord(page);
});

test("iPad: the public Quantitative Reasoning full mock keeps its table and calculator usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ipad-chromium", "Tablet quantitative journey");

  await page.goto("/practice/ucat-quantitative-reasoning-full-mock-v1");
  await completeUcatProfile(page);
  await page.getByRole("link", { name: "Quantitative Reasoning, 36 questions · 26 minutes. Start." }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();
  await expect(page.getByRole("table", { name: "Bookings, expected attendance and consultation capacity" })).toBeVisible();
  await page.getByRole("button", { name: "Basic calculator" }).click();
  const calculator = page.getByRole("region", { name: "Basic calculator" });
  await calculator.getByRole("button", { name: "7", exact: true }).click();
  await calculator.getByRole("button", { name: "Add" }).click();
  await calculator.getByRole("button", { name: "5", exact: true }).click();
  await calculator.getByRole("button", { name: "Equals" }).click();
  await expect(calculator.locator("output")).toHaveText("12");
  await page.getByRole("radio", { name: "Option B" }).check();
  await expect(page.getByLabel("1 of 36 answered")).toBeVisible();
  await expectNoDocumentOverflow(page);

  await submitCurrentPractice(page);
  await expect(page.locator(".score-seal")).toHaveAttribute("aria-label", /Score \d+(?:\.5)? \/ \d+/u);
  await expectLearningRecord(page);
});

test("phone: the public Situational Judgement full mock remains usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone-chromium", "Phone SJT journey");

  await page.goto("/practice/ucat-situational-judgement-full-mock-v1");
  await completeUcatProfile(page);
  await page.getByRole("link", { name: "Situational Judgement, 69 questions · 26 minutes. Start." }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Question 1/u })).toBeVisible();
  await expect(page.getByText("Situational judgement", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Option B" }).check();
  await expect(page.locator(".exam-header__progress")).toHaveAttribute("aria-label", "1 of 69 answered");
  await expect(page.getByRole("button", { name: "Questions" })).toBeVisible();
  await expectNoDocumentOverflow(page);

  await submitCurrentPractice(page);
  await expect(page.locator(".score-seal")).toHaveAttribute("aria-label", /Score \d+(?:\.5)? \/ \d+/u);
  await expectLearningRecord(page);
});
