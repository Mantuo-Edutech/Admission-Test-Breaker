import { render, screen, within } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

const guides = [
  {
    route: "/exams/tara",
    name: "TARA",
    title: /Reason, Solve, Write/u,
    format: "Critical Thinking",
  },
  {
    route: "/exams/lnat",
    name: "LNAT",
    title: /Read Critically\. Argue Clearly\./u,
    format: "Section A · Multiple Choice",
  },
  {
    route: "/exams/ucat",
    name: "UCAT",
    title: /Learn the Test Before You Time It/u,
    format: "Verbal Reasoning",
  },
] as const;

describe("public official exam guides", () => {
  it("keeps the ESAT course-to-module planner inside the product", async () => {
    const router = createAppRouter(["/exams/esat"]);
    const { container } = render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Choose your programme.*Find your modules/u,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Which courses are you applying for?" })).toBeInTheDocument();
    expect(screen.getByLabelText(/University/u)).toBeInTheDocument();
    expect(screen.getByLabelText(/Course/u)).toBeInTheDocument();
    expect(container.querySelector('a[href^="http"]')).not.toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(navigation).getByRole("link", { name: /ESAT Overview/u })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByText("建设中")).not.toBeInTheDocument();
  });

  it.each(guides)(
    "turns the $name route into a useful official starting point",
    async ({ route, name, title, format }) => {
      const router = createAppRouter([route]);
      render(<RouterProvider router={router} />);

      expect(
        await screen.findByRole("heading", { level: 1, name: title }),
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: format })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Start in this order" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Everything you need next" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open practice" })).toHaveAttribute("href", `${route}/past-papers`);
      expect(screen.getByRole("link", { name: "Open notes" })).toHaveAttribute("href", `${route}/resources`);
      expect(screen.queryByText(/来源清单|核验日期|权利状态/u)).not.toBeInTheDocument();
      const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
      expect(within(navigation).getByRole("link", { name: new RegExp(`${name} Overview`, "u") })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.queryByText("建设中")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Start training/u })).not.toBeInTheDocument();
    },
  );
});
