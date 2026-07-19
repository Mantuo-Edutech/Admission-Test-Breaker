import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";
import {
  createEsatPreparationPlan,
  saveEsatPreparationPlan,
} from "../../src/features/catalog/esat-plan.js";

function savePlan(withCourses: boolean) {
  saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
    programmeIds: ["imperial-h401"],
    moduleIds: ["mathematics-1", "physics", "mathematics-2"],
    entryCycle: "2027",
    curriculumId: withCourses ? "ap" : null,
    courseIds: withCourses ? ["ap-precalculus", "ap-calculus-bc", "ap-physics-1"] : [],
    updatedAt: "2026-07-19T08:00:00.000Z",
  }));
}

describe("ESAT mathematics review notes page", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("requires the programme and module plan first", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/esat/notes/mathematics"])} />);

    expect(await screen.findByRole("heading", { level: 1, name: "请先选择申请专业" })).toBeInTheDocument();
  });

  it("requires a course profile before making curriculum claims", async () => {
    savePlan(false);
    render(<RouterProvider router={createAppRouter(["/exams/esat/notes/mathematics"])} />);

    expect(await screen.findByRole("heading", { level: 1, name: "请先完成 ESAT 课程档案" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /填写课程信息/u })).toHaveAttribute("href", "/exams/esat/profile");
  });

  it("renders the selected mathematics modules, all 15 units and original teaching", async () => {
    savePlan(true);
    const { container } = render(
      <RouterProvider router={createAppRouter(["/exams/esat/notes/mathematics"])} />,
    );

    expect(await screen.findByText("ESAT Mathematics Starting Review Notes", {
      selector: "h1 span",
    })).toBeInTheDocument();
    expect(screen.getByText(/^Mathematics 1/u, { selector: ".review-notes-module h2 small" })).toBeInTheDocument();
    expect(screen.getByText(/^Mathematics 2/u, { selector: ".review-notes-module h2 small" })).toBeInTheDocument();
    expect(container.querySelectorAll(".review-notes-units li")).toHaveLength(15);
    expect(screen.getAllByText("ORIGINAL WORKED EXAMPLE")).toHaveLength(2);
    expect(container.querySelectorAll(".review-notes-recall details")).toHaveLength(6);
    expect(container.querySelector(".review-notes-next a")?.getAttribute("href"))
      .toBe("/exams/esat/past-papers");
    expect(screen.getByRole("link", { name: "下载 A4 PDF" })).toHaveAttribute(
      "href",
      "/notes/esat/esat-mathematics-foundations-v1.pdf",
    );
    expect(screen.getByRole("link", { name: "下载 A4 PDF" })).toHaveAttribute("download");
    expect(screen.queryByText(/官方分数线|录取概率|百分位/u)).not.toBeInTheDocument();
  });
});
