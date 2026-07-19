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
      ["我的准备", "/exams/tmua/dashboard"],
      ["历年真题", "/exams/tmua/past-papers"],
      ["题库与资料", "/exams/tmua/resources"],
      ["学习记录", "/exams/tmua/record"],
    ] as const) {
      expect(within(navigation).getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(within(navigation).getByRole("link", { name: "历年真题" })).toHaveAttribute(
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

  it("gives LNAT and UCAT real free-practice routes instead of placeholder anchors", async () => {
    const router = createAppRouter(["/exams/lnat/past-papers"]);
    render(<RouterProvider router={router} />);

    const navigation = await screen.findByRole("navigation", { name: "主要导航" });
    expect(within(navigation).getByRole("link", { name: "免费在线练习" })).toHaveAttribute(
      "href",
      "/exams/lnat/past-papers",
    );
    expect(within(navigation).getByRole("link", { name: "免费在线练习" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(navigation).getByRole("link", { name: "我的准备" })).toHaveAttribute(
      "href",
      "/exams/lnat/preparation",
    );
    expect(within(navigation).getByRole("link", { name: "学习记录" })).toHaveAttribute(
      "href",
      "/exams/lnat/record",
    );
  });

  it("changes the primary tabs when the student opens a different exam", async () => {
    const router = createAppRouter(["/exams/esat/resources"]);
    render(<RouterProvider router={router} />);

    const navigation = await screen.findByRole("navigation", { name: "主要导航" });
    for (const [name, href] of [
      ["ESAT 专业定位", "/exams/esat"],
      ["我的准备", "/exams/esat/dashboard"],
      ["历年真题", "/exams/esat/past-papers"],
      ["题库与资料", "/exams/esat/resources"],
      ["学习记录", "/exams/esat/record"],
    ] as const) {
      expect(within(navigation).getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(within(navigation).getByRole("link", { name: "题库与资料" })).toHaveAttribute(
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
    expect(within(navigation).getByRole("link", { name: "我的准备" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(navigation).getByRole("link", { name: "历年真题" })).toHaveAttribute(
      "href",
      "/exams/tmua/past-papers",
    );
    expect(within(navigation).getByRole("link", { name: "学习记录" })).toHaveAttribute(
      "href",
      "/exams/tmua/record",
    );
  });
});
