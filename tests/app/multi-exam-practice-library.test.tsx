import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";
import { createEsatPreparationPlan, saveEsatPreparationPlan } from "../../src/features/catalog/esat-plan.js";

describe("complete-paper multi-exam practice libraries", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("offers LNAT Section A and Section B as complete practice only", async () => {
    const router = createAppRouter(["/exams/lnat/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Choose a full paper.*选择完整试卷/u })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "LNAT practice facts" })).toHaveTextContent("2 full mocks");
    expect(screen.getByRole("list", { name: "Full Mocks" }).children).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Multiple Choice.*42 questions.*Start/u })).toHaveAttribute(
      "href", "/practice/lnat-section-a-full-mock-v1",
    );
    expect(screen.getByRole("link", { name: /Essay.*40 minutes.*Start/u })).toHaveAttribute(
      "href", "/practice/lnat-section-b-writing-v1",
    );
    expect(screen.queryByText(/starter|short diagnostic|短诊断|起点练习/iu)).not.toBeInTheDocument();
  });

  it("shows exactly four complete UCAT subtest mocks", async () => {
    const router = createAppRouter(["/exams/ucat/past-papers"]);
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /Choose a full paper/u });
    expect(screen.getByRole("list", { name: "Full Mocks" }).children).toHaveLength(4);
    for (const [label, href] of [
      ["Verbal Reasoning", "/practice/ucat-verbal-reasoning-full-mock-v1"],
      ["Decision Making", "/practice/ucat-decision-making-full-mock-v1"],
      ["Quantitative Reasoning", "/practice/ucat-quantitative-reasoning-full-mock-v1"],
      ["Situational Judgement", "/practice/ucat-situational-judgement-full-mock-v1"],
    ] as const) {
      expect(screen.getByRole("link", { name: new RegExp(`${label}.*Start`, "u") })).toHaveAttribute("href", href);
    }
    expect(screen.queryByText(/starter|short diagnostic|短诊断|起点练习/iu)).not.toBeInTheDocument();
  });

  it("separates current TARA full mocks from complete historical TSA papers", async () => {
    const router = createAppRouter(["/exams/tara/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("list", { name: "Full Mocks" })).toHaveTextContent("Critical Thinking");
    expect(screen.getByRole("list", { name: "Full Mocks" }).children).toHaveLength(3);
    expect(screen.getByRole("list", { name: "Historical Papers" }).children).toHaveLength(4);
    expect(screen.getByRole("link", { name: /TSA 2023.*50 questions.*Start/u })).toHaveAttribute(
      "href", "/practice/tara-tsa-2023-mixed-reasoning",
    );
    expect(screen.queryByText(/Reasoning Starter/u)).not.toBeInTheDocument();
  });

  it("classifies ESAT practice by Mathematics 1, Mathematics 2 and Physics", async () => {
    saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
      programmeIds: ["imperial-h401"],
      moduleIds: ["mathematics-1", "physics", "mathematics-2"],
      entryCycle: "2027",
      curriculumId: "a-level",
      courseIds: ["al-mathematics", "al-physics"],
      updatedAt: "2026-07-17T15:00:00.000Z",
    }));
    const router = createAppRouter(["/exams/esat/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Choose a full practice paper/u })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "ESAT practice facts" })).toHaveTextContent("3 required modules");
    expect(screen.getByRole("list", { name: "Full Mocks" }).children).toHaveLength(3);
    for (const [label, href] of [
      ["Mathematics 1", "/practice/esat-mathematics-1-full-mock-v1"],
      ["Mathematics 2", "/practice/esat-mathematics-2-full-mock-v1"],
      ["Physics", "/practice/esat-physics-full-mock-v1"],
    ] as const) {
      expect(screen.getByRole("link", { name: new RegExp(`${label} full mock.*Start`, "u") })).toHaveAttribute("href", href);
    }
    expect(screen.getByRole("list", { name: "Mathematics 1" }).children).toHaveLength(3);
    expect(screen.getByRole("list", { name: "Physics" }).children).toHaveLength(3);
    expect(screen.getByText(/No legacy paper maps directly to this current module/u)).toBeInTheDocument();
    expect(screen.queryByText(/Engineering practice|工程综合|starter|short diagnostic/iu)).not.toBeInTheDocument();
  });

  it("shows Chemistry full and historical module papers for chemical engineering", async () => {
    saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
      programmeIds: ["imperial-h801"], moduleIds: ["mathematics-1", "chemistry", "mathematics-2"],
      entryCycle: "2027", curriculumId: "a-level", courseIds: ["al-mathematics", "al-chemistry"],
      updatedAt: "2026-07-19T15:00:00.000Z",
    }));
    const router = createAppRouter(["/exams/esat/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("link", { name: /Chemistry full mock.*27 questions.*Start/u })).toHaveAttribute(
      "href", "/practice/esat-chemistry-full-mock-v1",
    );
    expect(screen.getByRole("list", { name: "Chemistry" }).children).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /Physics full mock/u })).not.toBeInTheDocument();
  });

  it("shows Biology and Chemistry as separate complete modules for biochemistry", async () => {
    saveEsatPreparationPlan(globalThis.localStorage, createEsatPreparationPlan({
      programmeIds: ["imperial-c700"], moduleIds: ["mathematics-1", "biology", "chemistry"],
      entryCycle: "2027", curriculumId: "a-level", courseIds: ["al-mathematics", "al-biology", "al-chemistry"],
      updatedAt: "2026-07-19T16:00:00.000Z",
    }));
    const router = createAppRouter(["/exams/esat/past-papers"]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("link", { name: /Biology full mock.*Start/u })).toHaveAttribute(
      "href", "/practice/esat-biology-full-mock-v1",
    );
    expect(screen.getByRole("list", { name: "Biology" }).children).toHaveLength(3);
    expect(screen.getByRole("list", { name: "Chemistry" }).children).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /Mathematics 2 full mock/u })).not.toBeInTheDocument();
  });
});
