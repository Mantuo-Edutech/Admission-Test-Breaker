import { render, screen, within } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

describe("standardized learning library", () => {
  it("shows only products that can be opened inside the site", async () => {
    render(<RouterProvider router={createAppRouter(["/library"])} />);

    expect(await screen.findByRole("heading", { name: /真正可以打开使用的内容/u })).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "资料使用顺序" })).getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "01了解考试UNDERSTAND",
      "02完成本人定位POSITION",
      "03进行在线练习PRACTISE",
      "04复习与深度解析REVIEW",
    ]);
    const library = screen.getByRole("region", { name: "可用题库与学习资料" });
    expect(within(library).getAllByRole("article")).toHaveLength(40);
    const tmuaPaperHeading = within(library).getByRole("heading", { name: /TMUA 历年真题在线题库/u });
    expect(tmuaPaperHeading).toBeInTheDocument();
    const tmuaPaperCard = tmuaPaperHeading.closest("article");
    expect(tmuaPaperCard).not.toBeNull();
    expect(within(tmuaPaperCard as HTMLElement).getByText("完成本人档案后使用")).toBeInTheDocument();
    expect(within(tmuaPaperCard as HTMLElement).getByRole("link", { name: /开始在线练习/u })).toHaveAttribute(
      "href",
      "/exams/tmua/past-papers",
    );
    expect(within(library).getByRole("heading", { name: /TMUA 六周精确训练计划/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /TMUA 30 分钟起点能力诊断/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /TMUA Early Specimen Paper 1 逐题深度解析/u })).toBeInTheDocument();
    expect(within(library).getAllByText("邀请码解锁")).toHaveLength(2);
    expect(within(library).getByRole("link", { name: "打开在线资料" })).toHaveAttribute(
      "href",
      "/exams/tmua/notes/six-week-plan",
    );
    expect(within(library).getByRole("link", { name: "完成试卷并打开解析" })).toHaveAttribute(
      "href",
      "/practice/tmua-specimen-p1",
    );
    for (const link of within(library).getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^\//u);
    }
  });

  it("shows TARA's guide, starter, both full reasoning modules and writing as separate products", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/tara/resources"])} />);

    expect(await screen.findByRole("heading", { name: /TARA 题库与学习资料/u })).toBeInTheDocument();
    const library = screen.getByRole("region", { name: "可用题库与学习资料" });
    expect(within(library).getAllByRole("article")).toHaveLength(7);
    expect(within(library).getByRole("heading", { name: /TARA 推理原创短诊断/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /TARA Critical Thinking 原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /TARA Problem Solving 原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /TARA 限时论证写作/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /TARA 考试与准备指南/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /TARA 逐模块起点定位/u })).toBeInTheDocument();
    const notesHeading = within(library).getByRole("heading", { name: /TARA 推理与写作起点复习笔记/u });
    expect(within(notesHeading.closest("article") as HTMLElement).getByRole("link", {
      name: /在线阅读并下载推理与写作笔记/u,
    })).toHaveAttribute("href", "/exams/tara/notes/foundations");
    expect(within(library).getAllByRole("article").map(
      (card) => within(card).getByRole("heading", { level: 2 }).textContent,
    )).toEqual([
      "TARA 考试与准备指南TARA Exam & Preparation Guide",
      "TARA 逐模块起点定位TARA Module-by-Module Starting Point",
      "TARA 推理原创短诊断TARA Reasoning Starter Diagnostic",
      "TARA Critical Thinking 原创完整模考TARA Critical Thinking Original Full-Length Mock",
      "TARA Problem Solving 原创完整模考TARA Problem Solving Original Full-Length Mock",
      "TARA 限时论证写作TARA Writing Task Practice",
      "TARA 推理与写作起点复习笔记TARA Reasoning and Writing Starting Review Notes",
    ]);
  });

  it("shows LNAT's guide, starter and complete Section A mock as separate products", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/lnat/resources"])} />);

    expect(await screen.findByRole("heading", { name: /LNAT 题库与学习资料/u })).toBeInTheDocument();
    const library = screen.getByRole("region", { name: "可用题库与学习资料" });
    expect(within(library).getAllByRole("article")).toHaveLength(6);
    expect(within(library).getByRole("heading", { name: /LNAT Section A 原创短诊断/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /LNAT Section A 原创完整结构模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /LNAT Section B 限时写作/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /LNAT 考试与准备指南/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /LNAT 逐模块起点定位/u })).toBeInTheDocument();
    const notesHeading = within(library).getByRole("heading", { name: /LNAT 论证阅读与写作起点复习笔记/u });
    expect(within(notesHeading.closest("article") as HTMLElement).getByRole("link", {
      name: /在线阅读并下载论证阅读与写作笔记/u,
    })).toHaveAttribute("href", "/exams/lnat/notes/foundations");
    expect(within(library).getAllByRole("article").map(
      (card) => within(card).getByRole("heading", { level: 2 }).textContent,
    )).toEqual([
      "LNAT 考试与准备指南LNAT Exam & Preparation Guide",
      "LNAT 逐模块起点定位LNAT Module-by-Module Starting Point",
      "LNAT Section A 原创短诊断LNAT Section A Starter Diagnostic",
      "LNAT Section A 原创完整结构模考LNAT Section A Original Complete-Structure Mock",
      "LNAT Section B 限时写作LNAT Section B Writing Practice",
      "LNAT 论证阅读与写作起点复习笔记LNAT Argument Reading and Writing Starting Review Notes",
    ]);
  });

  it("shows UCAT's guide, four starters and four complete mocks as separate products", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/ucat/resources"])} />);

    expect(await screen.findByRole("heading", { name: /UCAT 题库与学习资料/u })).toBeInTheDocument();
    const library = screen.getByRole("region", { name: "可用题库与学习资料" });
    expect(within(library).getAllByRole("article")).toHaveLength(11);
    expect(within(library).getByRole("heading", { name: /UCAT 文字推理原创短诊断/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /UCAT 文字推理原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /UCAT 数量推理原创短诊断/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /UCAT 数量推理原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /UCAT 决策判断原创短诊断/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /UCAT 决策判断原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /UCAT 情境判断原创短诊断/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /UCAT 情境判断原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /UCAT 考试与准备指南/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /UCAT 逐模块起点定位/u })).toBeInTheDocument();
    const notesHeading = within(library).getByRole("heading", { name: /UCAT 四模块与极限节奏起点复习笔记/u });
    expect(within(notesHeading.closest("article") as HTMLElement).getByRole("link", {
      name: /在线阅读并下载四模块与节奏笔记/u,
    })).toHaveAttribute("href", "/exams/ucat/notes/foundations");
  });

  it("filters the same registry for an exam-specific resources page", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/esat/resources"])} />);

    expect(await screen.findByRole("heading", { name: /ESAT 题库与学习资料/u })).toBeInTheDocument();
    const library = screen.getByRole("region", { name: "可用题库与学习资料" });
    expect(within(library).getAllByRole("article")).toHaveLength(10);
    expect(within(library).getByRole("heading", { name: /ESAT 专业与模块定位/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /ESAT 五模块原创短诊断/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /ESAT Mathematics 1 原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /ESAT Mathematics 2 原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /ESAT Physics 原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /ESAT Chemistry 原创完整模考/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /ESAT Biology 原创完整模考/u })).toBeInTheDocument();
    const notesHeading = within(library).getByRole("heading", { name: /ESAT 数学起点复习笔记/u });
    expect(notesHeading).toBeInTheDocument();
    expect(within(notesHeading.closest("article") as HTMLElement).getByRole("link", {
      name: /在线阅读并下载数学笔记/u,
    })).toHaveAttribute("href", "/exams/esat/notes/mathematics");
    const scienceNotesHeading = within(library).getByRole("heading", { name: /ESAT 理科模块起点复习笔记/u });
    expect(within(scienceNotesHeading.closest("article") as HTMLElement).getByRole("link", {
      name: /在线阅读并下载理科笔记/u,
    })).toHaveAttribute("href", "/exams/esat/notes/sciences");
    expect(within(library).queryByRole("heading", { name: /TMUA/u })).not.toBeInTheDocument();
  });
});
