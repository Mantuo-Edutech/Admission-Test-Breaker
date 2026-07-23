import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";
import { createEsatPreparationPlan, saveEsatPreparationPlan } from "../../src/features/catalog/esat-plan.js";

describe("action-first multi-exam practice libraries", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("gives LNAT students direct access to full and starting practice", async () => {
    const router = createAppRouter(["/exams/lnat/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /选择一套练习.*Choose your practice/u })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "LNAT 练习关键信息" })).toHaveTextContent("42 题完整模考");
    expect(screen.getByRole("list", { name: "完整练习 Full-length practice" })).toHaveTextContent("42 题 · 95 分钟");
    expect(screen.getByRole("link", { name: /Reading & Reasoning.*12 题.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/lnat-section-a-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Multiple Choice.*42 题.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/lnat-section-a-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /Essay.*40 分钟.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/lnat-section-b-writing-v1",
    );
    expect(screen.queryByText(/审核|校验|转换|归档/u)).not.toBeInTheDocument();
  });

  it("shows all four UCAT subtests with four complete original mocks", async () => {
    const router = createAppRouter(["/exams/ucat/past-papers"]);
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /选择一套练习.*Choose your practice/u });
    expect(screen.getAllByRole("listitem")).toHaveLength(11);
    expect(screen.getByRole("list", { name: "完整练习 Full-length practice" })).toHaveTextContent("44 题 · 22 分钟");
    expect(screen.getByRole("list", { name: "完整练习 Full-length practice" })).toHaveTextContent("35 题 · 37 分钟");
    expect(screen.getByRole("link", { name: /Verbal Reasoning 文字推理.*12 题.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/ucat-verbal-reasoning-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Verbal Reasoning 文字推理.*44 题.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/ucat-verbal-reasoning-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /Quantitative Reasoning 数量推理.*10 题.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/ucat-quantitative-reasoning-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Quantitative Reasoning 数量推理.*36 题.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/ucat-quantitative-reasoning-full-mock-v1",
    );
    expect(screen.getByRole("list", { name: "起点练习 Short practice" }).children).toHaveLength(4);
    expect(screen.queryByText(/审核|校验|转换|归档/u)).not.toBeInTheDocument();
  });

  it("shows the current TARA structure with real reasoning and writing practice", async () => {
    const router = createAppRouter(["/exams/tara/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /选择一套练习.*Choose your practice/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Reasoning Starter.*10 题.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/tara-reasoning-starter-v1",
    );
    expect(screen.getByRole("link", { name: /Critical Thinking 批判思维.*22 题.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/tara-critical-thinking-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /Problem Solving 问题解决.*22 题.*开始练习/u })).toHaveAttribute(
      "href",
      "/practice/tara-problem-solving-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /Argumentative Writing 限时论证写作.*40 分钟.*开始练习/u })).toHaveAttribute(
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

    expect(await screen.findByRole("heading", { name: /选择一个模块开始.*Choose a module/u })).toBeInTheDocument();
    expect(screen.queryByText(/LOCAL SOURCE AUDIT|本地校验文件|历史题卷 \+ 答案/u)).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "ESAT 练习关键信息" })).toHaveTextContent("3 个必考模块");
    expect(screen.getByRole("list", { name: "完整模考 Full-length practice" }).children).toHaveLength(3);
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
    expect(screen.getByRole("list", { name: "短诊断 Check your starting point" }).children).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Mathematics 1.*10 题/u })).toHaveAttribute("href", "/practice/esat-mathematics-1-starter-v1");
    expect(screen.getByRole("link", { name: /Physics.*10 题/u })).toHaveAttribute("href", "/practice/esat-physics-starter-v1");
    expect(screen.getByRole("link", { name: /Mathematics 2.*10 题/u })).toHaveAttribute("href", "/practice/esat-mathematics-2-starter-v1");
    expect(screen.queryByRole("link", { name: /Chemistry.*10 题/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Biology.*10 题/u })).not.toBeInTheDocument();
    expect(screen.queryByText(/审核|校验|转换|归档|联系冰冰|邀请码|按需解锁/u)).not.toBeInTheDocument();
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

    expect(await screen.findByRole("link", { name: /Chemistry.*27 题.*开始完整模考/u })).toHaveAttribute(
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

    expect(await screen.findByRole("link", { name: /Biology.*27 题.*开始完整模考/u })).toHaveAttribute(
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
