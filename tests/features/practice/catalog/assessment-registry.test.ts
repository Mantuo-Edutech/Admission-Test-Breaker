import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_REGISTRY,
  PRACTICE_ACCESS_POLICY,
  getAssessmentDefinition,
} from "../../../../src/features/practice/catalog/assessment-registry.js";

describe("multi-exam assessment registry", () => {
  it("keeps each official exam structure independently configurable", () => {
    expect(ASSESSMENT_REGISTRY.map((exam) => exam.id)).toEqual(["tmua", "esat", "tara", "lnat", "ucat"]);
    expect(getAssessmentDefinition("esat").sections).toHaveLength(5);
    expect(getAssessmentDefinition("tara").sections.map((section) => [section.id, section.questionCount, section.durationMinutes])).toEqual([
      ["critical-thinking", 22, 40],
      ["problem-solving", 22, 40],
      ["writing-task", 1, 40],
    ]);
    expect(getAssessmentDefinition("lnat").sections.map((section) => [section.id, section.questionCount, section.durationMinutes])).toEqual([
      ["section-a", 42, 95],
      ["section-b", 1, 40],
    ]);
    expect(getAssessmentDefinition("ucat").sections.map((section) => [section.questionCount, section.durationMinutes])).toEqual([
      [44, 22],
      [35, 37],
      [36, 26],
      [69, 26],
    ]);
  });

  it("keeps practice and factual results public while gating value-added interpretation", () => {
    expect(PRACTICE_ACCESS_POLICY).toEqual({
      attempt: "public",
      basicResult: "public",
      answerKey: "public",
      workedExplanation: "entitled",
      personalisedInterpretation: "entitled",
    });
  });
});
