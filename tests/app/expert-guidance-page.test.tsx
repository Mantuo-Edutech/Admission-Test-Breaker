import { render, screen, within } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

describe("expert guidance module", () => {
  it("answers the human-help question directly and shows Bingbing's QR code", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/tmua/coaching"])} />);

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "高效一对一，10 小时内解决最后的冲刺问题",
    })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "冰冰老师微信二维码" })).toBeInTheDocument();
    expect(screen.getByText("添加冰冰，预约 TMUA 10 小时冲刺")).toBeInTheDocument();
    expect(screen.getByText(/获取一对一安排/u)).toBeInTheDocument();
    const value = screen.getByRole("region", { name: "名师指点内容" });
    for (const heading of ["找准最后卡点", "制定 10 小时方案", "一对一集中解决"]) {
      expect(within(value).getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/不会自动开放你的课程信息、作答记录或学习数据/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "保存二维码" })).toHaveAttribute(
      "href",
      "/brand/bingbing-wechat-qr.jpg",
    );
  });
});
