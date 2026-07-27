import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";
import { createEsatPreparationPlan, saveEsatPreparationPlan } from "../../src/features/catalog/esat-plan.js";

describe("ESAT programme selector", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("turns a selected Imperial course into its exact module set", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(["/exams/esat"]);
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "Which courses are you applying for?" });
    await user.selectOptions(screen.getByLabelText(/University/u), "imperial");
    await user.selectOptions(screen.getByLabelText(/Course/u), "imperial-h401");
    await user.click(screen.getByRole("button", { name: "Add course" }));

    expect(screen.getAllByText("MODULES CONFIRMED").length).toBeGreaterThan(0);
    const result = screen.getByRole("heading", {
      level: 3,
      name: "Mathematics 1 · Physics · Mathematics 2",
    });
    expect(result).toHaveTextContent("Mathematics 2");
    expect(result).toHaveTextContent("Physics");
    expect(screen.getByRole("button", { name: "Continue to course profile" })).toBeInTheDocument();
  });

  it("warns when two courses require four distinct modules", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(["/exams/esat"]);
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "Which courses are you applying for?" });
    await user.selectOptions(screen.getByLabelText(/University/u), "imperial");
    for (const programmeId of ["imperial-h801", "imperial-h401"]) {
      await user.selectOptions(screen.getByLabelText(/Course/u), programmeId);
      await user.click(screen.getByRole("button", { name: "Add course" }));
    }

    expect(
      screen.getByRole("heading", { name: "One three-module combination cannot cover these courses." }),
    ).toBeInTheDocument();
    expect(within(screen.getByLabelText("Selected ESAT courses")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("continues from programme choice to course profile and coverage", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(["/exams/esat"]);
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "Which courses are you applying for?" });
    await user.selectOptions(screen.getByLabelText(/University/u), "imperial");
    await user.selectOptions(screen.getByLabelText(/Course/u), "imperial-h401");
    await user.click(screen.getByRole("button", { name: "Add course" }));
    await user.click(screen.getByRole("button", { name: "Continue to course profile" }));

    expect(router.state.location.pathname).toBe("/exams/esat/profile");
    await screen.findByRole("heading", { name: /Tell us what you study/u });
    await user.click(screen.getByLabelText(/A-Level \/ IAL/u));
    for (const course of ["Mathematics", "Further Mathematics", "Physics"]) {
      await user.click(screen.getByLabelText(course, { exact: true }));
    }
    await user.click(screen.getByRole("button", { name: /Save and view coverage/u }));

    expect(router.state.location.pathname).toBe("/exams/esat/coverage");
    expect(await screen.findByRole("heading", { name: /Your ESAT course coverage/u })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /Covered by your courses/u })).toHaveLength(3);
  });

  it("shows the exact knowledge units missing from an AP course combination", async () => {
    saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
      programmeIds: ["imperial-h401"],
      moduleIds: ["mathematics-1", "physics", "mathematics-2"],
      entryCycle: "2027",
      curriculumId: "ap",
      courseIds: ["ap-precalculus", "ap-calculus-bc", "ap-physics-1", "ap-physics-c"],
      updatedAt: "2026-07-17T15:00:00.000Z",
    }));
    const router = createAppRouter(["/exams/esat/coverage"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByText(/We checked 22 syllabus units/u)).toBeInTheDocument();
    const mathematicsGaps = screen.getByLabelText(/Mathematics 1 units to learn/u);
    expect(mathematicsGaps).toHaveTextContent(/M6\s*Statistics.*统计与数据表示/u);
    expect(mathematicsGaps).toHaveTextContent(/M7\s*Probability.*概率与条件概率/u);
    const physicsGaps = screen.getByLabelText(/Physics units to learn/u);
    expect(physicsGaps).toHaveTextContent(/P4\s*Thermal physics.*传热与热容量/u);
    expect(physicsGaps).toHaveTextContent(/P7\s*Radioactivity.*原子结构、衰变与半衰期/u);
    expect(screen.getByLabelText(/Mathematics 2 units to verify/u)).toHaveTextContent(/MM3\s*Coordinate geometry.*坐标几何与圆/u);
  });
});
