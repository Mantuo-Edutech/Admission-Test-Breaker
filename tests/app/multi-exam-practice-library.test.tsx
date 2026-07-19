import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";
import { createEsatPreparationPlan, saveEsatPreparationPlan } from "../../src/features/catalog/esat-plan.js";

describe("honest multi-exam practice readiness pages", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("shows LNAT structure with real Section A and Section B original practice", async () => {
    const router = createAppRouter(["/exams/lnat/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /先看清每个模块怎么考/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "文章阅读与推理" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "论证写作" })).toBeInTheDocument();
    expect(screen.getByText("42 题")).toBeInTheDocument();
    expect(screen.getAllByText("95 分钟").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("heading", { name: /先做短诊断，再完成 42 题全卷/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Section A Starter/u })).toHaveAttribute(
      "href",
      "/practice/lnat-section-a-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Section A Full Mock/u })).toHaveAttribute(
      "href",
      "/practice/lnat-section-a-full-mock-v1",
    );
    expect(screen.getByText(/12 篇满托原创英文论证文章、42 道四选一题、95 分钟/u)).toBeInTheDocument();
    expect(screen.getByText(/完整模考只报告 42 分原始正确数/u)).toBeInTheDocument();
    expect(screen.getByText(/建议 500–600 词、上限 750 词/u)).toBeInTheDocument();
    expect(screen.getByText(/当前不生成自动分数/u)).toBeInTheDocument();
    expect(screen.queryByText("按需解锁")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /开始 Section A 完整模考/u })).toHaveAttribute(
      "href",
      "/practice/lnat-section-a-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /开始 Section B 写作/u })).toHaveAttribute(
      "href",
      "/practice/lnat-section-b-writing-v1",
    );
  });

  it("shows all four UCAT subtests with four complete original mocks", async () => {
    const router = createAppRouter(["/exams/ucat/past-papers"]);
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /先看清每个模块怎么考/u });
    for (const name of ["文字推理", "决策判断", "数量推理", "情境判断"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(screen.getByText("22 分钟")).toBeInTheDocument();
    expect(screen.getByText("37 分钟")).toBeInTheDocument();
    expect(screen.getAllByText("26 分钟")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: /先体验四个模块，再完成四套全卷/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Verbal Reasoning Starter/u })).toHaveAttribute(
      "href",
      "/practice/ucat-verbal-reasoning-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Verbal Reasoning Full Mock/u })).toHaveAttribute(
      "href",
      "/practice/ucat-verbal-reasoning-full-mock-v1",
    );
    expect(screen.getByText(/11 篇满托原创英文材料、44 道题、22 分钟/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /开始文字推理完整模考/u })).toHaveAttribute(
      "href",
      "/practice/ucat-verbal-reasoning-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /先做 12 题短诊断/u })).toHaveAttribute(
      "href",
      "/practice/ucat-verbal-reasoning-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Quantitative Reasoning Starter/u })).toHaveAttribute(
      "href",
      "/practice/ucat-quantitative-reasoning-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Quantitative Reasoning Full Mock/u })).toHaveAttribute(
      "href",
      "/practice/ucat-quantitative-reasoning-full-mock-v1",
    );
    expect(screen.getByText(/9 组满托原创数据材料、36 道四选一题、26 分钟/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /开始数量推理完整模考/u })).toHaveAttribute(
      "href",
      "/practice/ucat-quantitative-reasoning-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /先做 10 题短诊断/u })).toHaveAttribute(
      "href",
      "/practice/ucat-quantitative-reasoning-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Decision Making Starter/u })).toHaveAttribute(
      "href",
      "/practice/ucat-decision-making-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Decision Making Full Mock/u })).toHaveAttribute(
      "href",
      "/practice/ucat-decision-making-full-mock-v1",
    );
    expect(screen.getByText(/35 道满托原创题、37 分钟，含 29 道四选一与 6 组五陈述题/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /开始决策判断完整模考/u })).toHaveAttribute(
      "href",
      "/practice/ucat-decision-making-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /先做 8 题短诊断/u })).toHaveAttribute(
      "href",
      "/practice/ucat-decision-making-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Situational Judgement Starter/u })).toHaveAttribute(
      "href",
      "/practice/ucat-situational-judgement-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Situational Judgement Full Mock/u })).toHaveAttribute(
      "href",
      "/practice/ucat-situational-judgement-full-mock-v1",
    );
    expect(screen.getByText(/21 个满托原创情境、69 道题、26 分钟/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /开始情境判断完整模考/u })).toHaveAttribute(
      "href",
      "/practice/ucat-situational-judgement-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /先做 SJT 10 题短诊断/u })).toHaveAttribute(
      "href",
      "/practice/ucat-situational-judgement-starter-v1",
    );
    expect(screen.queryByText(/本模块尚无通过来源、权利、专属交互和评分验收/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/不等同于正式 11 篇、44 题/u)).not.toBeInTheDocument();
  });

  it("shows the current TARA structure with real reasoning and writing practice", async () => {
    const router = createAppRouter(["/exams/tara/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /先看清每个模块怎么考/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /先做短诊断，再完成两个完整模块/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "批判思维" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "问题解决" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "限时论证写作" })).toBeInTheDocument();
    expect(screen.getAllByText("22 题")).toHaveLength(2);
    expect(screen.getAllByText("40 分钟")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Reasoning Starter/u })).toHaveAttribute(
      "href",
      "/practice/tara-reasoning-starter-v1",
    );
    expect(screen.getByRole("link", { name: /^02Critical Thinking完整模考/u })).toHaveAttribute(
      "href",
      "/practice/tara-critical-thinking-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /^03Problem Solving完整模考/u })).toHaveAttribute(
      "href",
      "/practice/tara-problem-solving-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /开始 Critical Thinking 完整模考/u })).toHaveAttribute(
      "href",
      "/practice/tara-critical-thinking-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /开始 Problem Solving 完整模考/u })).toHaveAttribute(
      "href",
      "/practice/tara-problem-solving-full-mock-v1",
    );
    expect(screen.getByText(/上限 750 词；编辑器提供计时、字数统计、私密自动保存/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /开始限时写作/u })).toHaveAttribute(
      "href",
      "/practice/tara-writing-task-v1",
    );
  });

  it("shows only required ESAT modules without an unpublished deep-review promise", async () => {
    saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
      programmeIds: ["imperial-h401"],
      moduleIds: ["mathematics-1", "physics", "mathematics-2"],
      entryCycle: "2027",
      curriculumId: "a-level",
      courseIds: ["al-mathematics", "al-physics"],
      updatedAt: "2026-07-17T15:00:00.000Z",
    }));
    const router = createAppRouter(["/exams/esat/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /只练你申请专业真正需要的模块/u })).toBeInTheDocument();
    expect(screen.getByText("39 份官方资料已完整下载并通过文件校验")).toBeInTheDocument();
    expect(screen.getByText("39")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getAllByText("10 道短诊断 + 27 道完整模考已经原生上线")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: /用完整模考校准每个模块的做题节奏/u })).toBeInTheDocument();
    expect(screen.getByText("27 道", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("40 分钟", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mathematics 1.*开始完整模考/u })).toHaveAttribute(
      "href",
      "/practice/esat-mathematics-1-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /Mathematics 2.*开始完整模考/u })).toHaveAttribute(
      "href",
      "/practice/esat-mathematics-2-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /Physics.*开始完整模考/u })).toHaveAttribute(
      "href",
      "/practice/esat-physics-full-mock-v1",
    );
    expect(screen.getByRole("heading", { name: /再用短诊断逐模块检查缺口/u })).toBeInTheDocument();
    expect(screen.getByText("30 道")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mathematics 1.*10 题/u })).toHaveAttribute("href", "/practice/esat-mathematics-1-starter-v1");
    expect(screen.getByRole("link", { name: /Physics.*10 题/u })).toHaveAttribute("href", "/practice/esat-physics-starter-v1");
    expect(screen.getByRole("link", { name: /Mathematics 2.*10 题/u })).toHaveAttribute("href", "/practice/esat-mathematics-2-starter-v1");
    expect(screen.queryByRole("link", { name: /Chemistry.*10 题/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Biology.*10 题/u })).not.toBeInTheDocument();
    expect(screen.queryByText(/联系冰冰.*邀请码/u)).not.toBeInTheDocument();
    expect(screen.queryByText("按需解锁")).not.toBeInTheDocument();
  });

  it("shows the Chemistry starter and full mock for a real chemical-engineering plan", async () => {
    saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
      programmeIds: ["imperial-h801"],
      moduleIds: ["mathematics-1", "chemistry", "mathematics-2"],
      entryCycle: "2027",
      curriculumId: "a-level",
      courseIds: ["al-mathematics", "al-chemistry"],
      updatedAt: "2026-07-19T15:00:00.000Z",
    }));
    const router = createAppRouter(["/exams/esat/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("link", { name: /Chemistry.*C1–C17.*开始完整模考/u })).toHaveAttribute(
      "href",
      "/practice/esat-chemistry-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /Chemistry.*10 题/u })).toHaveAttribute(
      "href",
      "/practice/esat-chemistry-starter-v1",
    );
    expect(screen.queryByRole("link", { name: /Physics.*开始完整模考/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Biology.*10 题/u })).not.toBeInTheDocument();
  });

  it("shows the Biology starter and full mock for a real biochemistry plan", async () => {
    saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
      programmeIds: ["imperial-c700"],
      moduleIds: ["mathematics-1", "biology", "chemistry"],
      entryCycle: "2027",
      curriculumId: "a-level",
      courseIds: ["al-mathematics", "al-biology", "al-chemistry"],
      updatedAt: "2026-07-19T16:00:00.000Z",
    }));
    const router = createAppRouter(["/exams/esat/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("link", { name: /Biology.*B1–B11.*开始完整模考/u })).toHaveAttribute(
      "href",
      "/practice/esat-biology-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /Biology.*10 题/u })).toHaveAttribute(
      "href",
      "/practice/esat-biology-starter-v1",
    );
    expect(screen.queryByRole("link", { name: /Physics.*开始完整模考/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Mathematics 2.*开始完整模考/u })).not.toBeInTheDocument();
  });
});
