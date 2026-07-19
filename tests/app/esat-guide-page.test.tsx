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

    await screen.findByRole("heading", { name: "你准备申请哪些专业？" });
    await user.selectOptions(screen.getByLabelText("学校"), "imperial");
    await user.selectOptions(screen.getByLabelText("专业"), "imperial-h401");
    await user.click(screen.getByRole("button", { name: "加入申请选择" }));

    expect(screen.getByText("模块已经确定")).toBeInTheDocument();
    const result = screen.getByRole("heading", {
      level: 3,
      name: "Mathematics 1 · Physics · Mathematics 2",
    });
    expect(result).toHaveTextContent("Mathematics 2");
    expect(result).toHaveTextContent("Physics");
    expect(screen.getByRole("button", { name: "确定模块，填写课程信息" })).toBeInTheDocument();
  });

  it("warns when two courses require four distinct modules", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(["/exams/esat"]);
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "你准备申请哪些专业？" });
    await user.selectOptions(screen.getByLabelText("学校"), "imperial");
    for (const programmeId of ["imperial-h801", "imperial-h401"]) {
      await user.selectOptions(screen.getByLabelText("专业"), programmeId);
      await user.click(screen.getByRole("button", { name: "加入申请选择" }));
    }

    expect(
      screen.getByRole("heading", { name: "三个模块无法同时满足这些专业" }),
    ).toBeInTheDocument();
    expect(within(screen.getByLabelText("已选择的 ESAT 专业")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("continues from programme choice to course profile and coverage", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(["/exams/esat"]);
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "你准备申请哪些专业？" });
    await user.selectOptions(screen.getByLabelText("学校"), "imperial");
    await user.selectOptions(screen.getByLabelText("专业"), "imperial-h401");
    await user.click(screen.getByRole("button", { name: "加入申请选择" }));
    await user.click(screen.getByRole("button", { name: "确定模块，填写课程信息" }));

    expect(router.state.location.pathname).toBe("/exams/esat/profile");
    await screen.findByRole("heading", { name: /填写你的课程信息/u });
    await user.click(screen.getByLabelText(/A-Level \/ IAL/u));
    for (const course of ["Mathematics", "Further Mathematics", "Physics"]) {
      await user.click(screen.getByLabelText(course, { exact: true }));
    }
    await user.click(screen.getByRole("button", { name: /保存并查看知识覆盖/u }));

    expect(router.state.location.pathname).toBe("/exams/esat/coverage");
    expect(await screen.findByRole("heading", { name: /你的 ESAT 知识覆盖/u })).toBeInTheDocument();
    expect(screen.getAllByText("课程知识基本覆盖")).toHaveLength(3);
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

    expect(await screen.findByText(/已逐项核对 22 个官方知识单元/u)).toBeInTheDocument();
    const mathematicsGaps = screen.getByLabelText("Mathematics 1需要补充");
    expect(mathematicsGaps).toHaveTextContent(/M6\s*统计与数据表示Statistics/u);
    expect(mathematicsGaps).toHaveTextContent(/M7\s*概率与条件概率Probability/u);
    const physicsGaps = screen.getByLabelText("Physics需要补充");
    expect(physicsGaps).toHaveTextContent(/P4\s*传热与热容量Thermal physics/u);
    expect(physicsGaps).toHaveTextContent(/P7\s*原子结构、衰变与半衰期Radioactivity/u);
    expect(screen.getByLabelText("Mathematics 2需要确认")).toHaveTextContent(/MM3\s*坐标几何与圆Coordinate geometry/u);
  });
});
