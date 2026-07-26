import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";
import {
  createEsatPreparationPlan,
  saveEsatPreparationPlan,
} from "../../src/features/catalog/esat-plan.js";

function savePlan(value: {
  programmeId: string;
  moduleIds: ("mathematics-1" | "mathematics-2" | "physics" | "chemistry" | "biology")[];
  courseIds: string[];
}) {
  saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
    programmeIds: [value.programmeId],
    moduleIds: value.moduleIds,
    entryCycle: "2027",
    curriculumId: "ap",
    courseIds: value.courseIds,
    updatedAt: "2026-07-19T10:00:00.000Z",
  }));
}

describe("ESAT science review notes page", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("requires the programme and module plan first", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/esat/notes/sciences"])} />);

    expect(await screen.findByRole("heading", { level: 1, name: /Choose your programme first.*请先选择申请专业/u })).toBeInTheDocument();
  });

  it("does not prescribe unnecessary science study to a mathematics-only programme", async () => {
    savePlan({
      programmeId: "imperial-28g3",
      moduleIds: ["mathematics-1", "mathematics-2"],
      courseIds: ["ap-precalculus", "ap-calculus-bc"],
    });
    render(<RouterProvider router={createAppRouter(["/exams/esat/notes/sciences"])} />);

    expect(await screen.findByRole("heading", { level: 1, name: /Your programme does not require a science module.*你的专业不需要理科模块/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /打开数学复习笔记/u })).toHaveAttribute(
      "href",
      "/exams/esat/notes/mathematics",
    );
  });

  it("shows only Physics for an engineering programme", async () => {
    savePlan({
      programmeId: "imperial-h401",
      moduleIds: ["mathematics-1", "physics", "mathematics-2"],
      courseIds: ["ap-precalculus", "ap-calculus-bc", "ap-physics-1"],
    });
    const { container } = render(
      <RouterProvider router={createAppRouter(["/exams/esat/notes/sciences"])} />,
    );

    expect(await screen.findByText("ESAT Science Modules Starting Review Notes", {
      selector: "h1 .english-first-text__primary",
    })).toBeInTheDocument();
    expect(container.querySelectorAll(".review-notes-module")).toHaveLength(1);
    expect(container.querySelectorAll(".review-notes-units li")).toHaveLength(7);
    expect(screen.getByText(/^Physics —/u, { selector: ".review-notes-module h2 .english-first-text__primary" })).toHaveAttribute("lang", "en");
    expect(screen.getByText(/Physics is not about memorising more formulae/u)).toHaveAttribute("lang", "en");
    expect(screen.getByText("The question contains several objects, branches, energy transfers or initial and final states.")).toHaveAttribute("lang", "en");
    expect(screen.queryByText(/^Chemistry —/u, { selector: ".review-notes-module h2 .english-first-text__primary" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download A4 PDF/u })).toHaveAttribute(
      "href",
      "/notes/esat/esat-sciences-foundations-v1.pdf",
    );
  });

  it("shows Chemistry and Biology for a life-sciences programme", async () => {
    savePlan({
      programmeId: "imperial-c700",
      moduleIds: ["mathematics-1", "chemistry", "biology"],
      courseIds: ["ap-precalculus", "ap-chemistry", "ap-biology"],
    });
    const { container } = render(
      <RouterProvider router={createAppRouter(["/exams/esat/notes/sciences"])} />,
    );

    expect(await screen.findByText("ESAT Science Modules Starting Review Notes", {
      selector: "h1 .english-first-text__primary",
    })).toBeInTheDocument();
    expect(container.querySelectorAll(".review-notes-module")).toHaveLength(2);
    expect(container.querySelectorAll(".review-notes-units li")).toHaveLength(28);
    expect(screen.getByText(/^Chemistry —/u, { selector: ".review-notes-module h2 .english-first-text__primary" })).toHaveAttribute("lang", "en");
    expect(screen.getByText(/^Biology —/u, { selector: ".review-notes-module h2 .english-first-text__primary" })).toHaveAttribute("lang", "en");
    expect(container.querySelectorAll(".review-notes-example")).toHaveLength(2);
  });
});
