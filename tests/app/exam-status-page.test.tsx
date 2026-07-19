import { render, screen, within } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

const guides = [
  {
    route: "/exams/tara",
    name: "TARA",
    title: /三部分能力.*Reason, Solve, Write/u,
    format: "Critical Thinking",
    officialLink: "TARA Question Guide",
  },
  {
    route: "/exams/lnat",
    name: "LNAT",
    title: /阅读论证.*Read Critically\. Argue Clearly\./u,
    format: "Section A · Multiple Choice",
    officialLink: "LNAT 官方练习",
  },
  {
    route: "/exams/ucat",
    name: "UCAT",
    title: /先熟悉题型.*Learn the Test Before You Time It/u,
    format: "Verbal Reasoning",
    officialLink: "官方题库与模考",
  },
] as const;

describe("public official exam guides", () => {
  it("keeps the ESAT course-to-module planner inside the product", async () => {
    const router = createAppRouter(["/exams/esat"]);
    const { container } = render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /先选专业.*COURSE-TO-MODULE PLANNER/u,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "你准备申请哪些专业？" })).toBeInTheDocument();
    expect(screen.getByLabelText("学校")).toBeInTheDocument();
    expect(screen.getByLabelText("专业")).toBeInTheDocument();
    expect(container.querySelector('a[href^="http"]')).not.toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "主要导航" });
    expect(within(navigation).getByRole("link", { name: "ESAT 专业定位" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByText("建设中")).not.toBeInTheDocument();
  });

  it.each(guides)(
    "turns the $name route into a useful official starting point",
    async ({ route, name, title, format, officialLink }) => {
      const router = createAppRouter([route]);
      render(<RouterProvider router={router} />);

      expect(
        await screen.findByRole("heading", { level: 1, name: title }),
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: format })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "按这个顺序开始" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: new RegExp(officialLink, "u") })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: new RegExp(officialLink, "u") })).not.toBeInTheDocument();
      expect(screen.getAllByText("已纳入本站来源清单").length).toBeGreaterThan(0);
      const navigation = screen.getByRole("navigation", { name: "主要导航" });
      expect(within(navigation).getByRole("link", { name: `${name} 概览` })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.queryByText("建设中")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /开始训练/u })).not.toBeInTheDocument();
    },
  );
});
