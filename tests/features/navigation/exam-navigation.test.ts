import { describe, expect, it } from "vitest";
import { EXAM_CATALOG } from "../../../src/features/catalog/exams.js";
import {
  activePrimaryModule,
  primaryNavigationForExam,
} from "../../../src/features/navigation/exam-navigation.js";

describe("task-oriented exam navigation registry", () => {
  it("defines the same five user tasks for every exam", () => {
    for (const exam of EXAM_CATALOG) {
      expect(primaryNavigationForExam(exam).map((item) => item.id)).toEqual([
        "overview",
        "coverage",
        "practice",
        "notes",
        "coaching",
      ]);
    }
  });

  it("keeps profile setup inside coverage and diagnostics inside practice", () => {
    expect(activePrimaryModule("tmua", "/exams/tmua/profile")).toBe("coverage");
    expect(activePrimaryModule("tmua", "/exams/tmua/coverage")).toBe("coverage");
    expect(activePrimaryModule("tmua", "/exams/tmua/diagnostic")).toBe("practice");
    expect(activePrimaryModule("tmua", "/exams/tmua/past-papers")).toBe("practice");
    expect(activePrimaryModule("tmua", "/exams/tmua/notes/foundations")).toBe("notes");
    expect(activePrimaryModule("tmua", "/exams/tmua/coaching")).toBe("coaching");
  });
});
