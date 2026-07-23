import { render, screen, within } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

describe("expert guidance module", () => {
  it("answers the human-help question directly and shows Bingbing's QR code", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/tmua/coaching"])} />);

    expect(await screen.findByRole("heading", {
      level: 1,
      name: "卡住的题，不必一个人耗下去",
    })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "冰冰老师微信二维码" })).toBeInTheDocument();
    expect(screen.getByText("添加冰冰，预约 TMUA 备考判断")).toBeInTheDocument();
    const value = screen.getByRole("region", { name: "名师指点内容" });
    for (const heading of ["看清真正卡点", "给出下一步训练", "需要时再安排课程"]) {
      expect(within(value).getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/不会自动开放你的课程信息、作答记录或学习数据/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "保存二维码" })).toHaveAttribute(
      "href",
      "/brand/bingbing-wechat-qr.jpg",
    );
  });
});
