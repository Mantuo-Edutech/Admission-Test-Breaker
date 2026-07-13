import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

const unopened = [
  {
    route: "/exams/esat",
    name: "ESAT",
    purpose: "数学与科学模块化入学测试",
  },
  {
    route: "/exams/tara",
    name: "TARA",
    purpose: "批判思维、问题解决与写作",
  },
  {
    route: "/exams/ucat",
    name: "UCAT",
    purpose: "医学与牙科申请能力测试",
  },
] as const;

describe("unopened exam spaces", () => {
  it.each(unopened)(
    "shows an honest construction state for $name",
    async ({ route, name, purpose }) => {
      const router = createAppRouter([route]);
      render(<RouterProvider router={router} />);

      expect(
        await screen.findByRole("heading", { name }),
      ).toBeInTheDocument();
      expect(screen.getByText(purpose)).toBeInTheDocument();
      expect(screen.getByText("资料馆建设中")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "返回全部考试" }),
      ).toHaveAttribute("href", "/");
      expect(
        screen.queryByRole("link", { name: /开始训练/u }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /开始训练/u }),
      ).not.toBeInTheDocument();
    },
  );
});
