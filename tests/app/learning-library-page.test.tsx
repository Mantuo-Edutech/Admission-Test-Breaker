import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

describe("task-oriented notes and global product catalogue", () => {
  it("keeps the global catalogue as a complete internal product index", async () => {
    render(<RouterProvider router={createAppRouter(["/library"])} />);

    expect(await screen.findByRole("heading", {
      name: /Practice, Coverage & Review Notes.*完整题库与复习资料/u,
    })).toBeInTheDocument();
    const library = screen.getByRole("region", { name: /Available practice and learning resources.*可用题库与学习资料/u });
    expect(within(library).getAllByRole("article")).toHaveLength(42);
    expect(within(library).getByRole("heading", { name: /TMUA Online Past Papers.*TMUA 历年真题在线题库/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /TMUA Foundations Review Notes.*TMUA 基础复习笔记/u })).toBeInTheDocument();
    expect(within(library).getByRole("heading", { name: /ESAT Mathematics 1 Original Full-Length Mock.*ESAT Mathematics 1 原创完整模考/u })).toBeInTheDocument();
    for (const link of within(library).getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^\//u);
    }
  });

  it("separates TMUA foundation notes from advanced notes and opens the WeChat path", async () => {
    const user = userEvent.setup();
    render(<RouterProvider router={createAppRouter(["/exams/tmua/resources"])} />);

    expect(await screen.findByRole("heading", {
      level: 1,
      name: /Build the foundation\. Go deeper when it matters\..*先补基础，再看深度/u,
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Foundation Review Notes.*基础复习笔记/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Advanced Notes & Worked Explanations.*深度笔记与逐题精讲/u })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: /TMUA Foundations Review Notes.*TMUA 基础复习笔记/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /TMUA Early Specimen Paper 1 Worked Review.*TMUA Early Specimen Paper 1 逐题深度解析/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /TMUA Six-Week Precision Training Plan.*TMUA 六周精确训练计划/u })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /TMUA 历年真题在线题库/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /TMUA 课程知识覆盖/u })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Get advanced notes.*获取深度笔记/u })[0]!);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "冰冰老师微信二维码" })).toBeInTheDocument();
  });

  it("shows only ESAT notes on the ESAT notes module", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/esat/resources"])} />);

    expect(await screen.findByRole("heading", { name: /Foundation Review Notes.*基础复习笔记/u })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: /ESAT Mathematics Starting Review Notes.*ESAT 数学起点复习笔记/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ESAT Science Modules Starting Review Notes.*ESAT 理科模块起点复习笔记/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ESAT Advanced Review Notes.*ESAT 深度复习笔记/u })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /ESAT Mathematics 1 原创完整模考/u })).not.toBeInTheDocument();
  });

  it.each([
    ["tara", /TARA Reasoning and Writing Starting Review Notes.*TARA 推理与写作起点复习笔记/u, 2],
    ["lnat", /LNAT Argument Reading and Writing Starting Review Notes.*LNAT 论证阅读与写作起点复习笔记/u, 1],
    ["ucat", /UCAT Four-Subtest and High-Speed Pacing Starting Review Notes.*UCAT 四模块与极限节奏起点复习笔记/u, 1],
  ] as const)("keeps %s resources focused on its notes", async (examId, heading, count) => {
    render(<RouterProvider router={createAppRouter([`/exams/${examId}/resources`])} />);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(count);
  });
});
