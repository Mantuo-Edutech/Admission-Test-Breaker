import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

describe("lightweight exam-context navigation", () => {
  it("lets students move directly between every primary TMUA section", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(["/exams/tmua/past-papers"]);
    render(<RouterProvider router={router} />);

    const navigation = await screen.findByRole("navigation", { name: "主要导航" });
    for (const [name, href] of [
      ["TMUA 概览", "/exams/tmua"],
      ["知识覆盖", "/exams/tmua/coverage"],
      ["在线练习", "/exams/tmua/past-papers"],
      ["复习笔记", "/exams/tmua/resources"],
      ["名师指点", "/exams/tmua/coaching"],
    ] as const) {
      expect(within(navigation).getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(within(navigation).getByRole("link", { name: "在线练习" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(navigation).queryByRole("link", { name: "全部考试" })).not.toBeInTheDocument();
    await user.click(screen.getByText("TMUA", { selector: ".exam-switcher summary span" }));
    const switcher = screen.getByRole("navigation", { name: "切换考试" });
    expect(within(switcher).getByRole("link", { name: "全部考试" })).toHaveAttribute("href", "/");
    for (const name of ["TMUA", "ESAT", "TARA", "LNAT", "UCAT"]) {
      expect(within(switcher).getByRole("link", { name: new RegExp(`^${name}`, "u") })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "满托考试练习场首页" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("gives every exam the same task-oriented module structure", async () => {
    const router = createAppRouter(["/exams/lnat/past-papers"]);
    render(<RouterProvider router={router} />);

    const navigation = await screen.findByRole("navigation", { name: "主要导航" });
    expect(within(navigation).getByRole("link", { name: "在线练习" })).toHaveAttribute(
      "href",
      "/exams/lnat/past-papers",
    );
    expect(within(navigation).getByRole("link", { name: "在线练习" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(navigation).getByRole("link", { name: "知识覆盖" })).toHaveAttribute(
      "href",
      "/exams/lnat/preparation",
    );
    expect(within(navigation).getByRole("link", { name: "复习笔记" })).toHaveAttribute(
      "href",
      "/exams/lnat/resources",
    );
    expect(within(navigation).getByRole("link", { name: "名师指点" })).toHaveAttribute(
      "href",
      "/exams/lnat/coaching",
    );
  });

  it("changes the primary tabs when the student opens a different exam", async () => {
    const router = createAppRouter(["/exams/esat/resources"]);
    render(<RouterProvider router={router} />);

    const navigation = await screen.findByRole("navigation", { name: "主要导航" });
    for (const [name, href] of [
      ["ESAT 概览", "/exams/esat"],
      ["知识覆盖", "/exams/esat/coverage"],
      ["在线练习", "/exams/esat/past-papers"],
      ["复习笔记", "/exams/esat/resources"],
      ["名师指点", "/exams/esat/coaching"],
    ] as const) {
      expect(within(navigation).getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(within(navigation).getByRole("link", { name: "复习笔记" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(navigation).queryByRole("link", { name: "TMUA 概览" })).not.toBeInTheDocument();
  });

  it("provides the same destinations in a compact mobile menu", async () => {
    const router = createAppRouter(["/exams/tmua/coverage"]);
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", {
      name: "请先填写课程信息",
    });
    expect(screen.getByText("TMUA 导航", { selector: "summary span" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "移动端主要导航" });
    expect(within(navigation).getByRole("link", { name: "知识覆盖" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(navigation).getByRole("link", { name: "在线练习" })).toHaveAttribute(
      "href",
      "/exams/tmua/past-papers",
    );
    expect(within(navigation).getByRole("link", { name: "名师指点" })).toHaveAttribute(
      "href",
      "/exams/tmua/coaching",
    );
  });
});
