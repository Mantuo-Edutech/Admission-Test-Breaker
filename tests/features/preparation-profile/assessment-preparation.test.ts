import { describe, expect, it } from "vitest";
import { buildAssessmentPreparationPlan } from "../../../src/features/preparation-profile/assessment-preparation.js";
import {
  createAssessmentBackgroundProfile,
  type CreateAssessmentBackgroundProfileInput,
} from "../../../src/features/preparation-profile/assessment-profile-domain.js";

const base: Omit<CreateAssessmentBackgroundProfileInput, "examId"> = {
  guestSpaceId: "gsp_assessment-preparation-test",
  entryCycle: "2027",
  curriculumId: "a-level",
  learningStage: "year-12",
  subjectAreas: ["mathematics", "biology"],
  experience: "sampled",
  weeklyTime: "2-4",
  createdAt: "2026-07-18T12:00:00.000Z",
  updatedAt: "2026-07-18T12:00:00.000Z",
};

describe("deterministic assessment starting point", () => {
  it("maps a UCAT background to concrete module-level transfer and gap conclusions", () => {
    const plan = buildAssessmentPreparationPlan(createAssessmentBackgroundProfile({
      ...base,
      examId: "ucat",
    }));

    expect(plan.modules.map((module) => [module.id, module.status])).toEqual([
      ["verbal-reasoning", "foundation-check"],
      ["decision-making", "curriculum-transfer"],
      ["quantitative-reasoning", "curriculum-transfer"],
      ["situational-judgement", "exam-specific"],
    ]);
    expect(plan.firstCycleHours).toEqual([12, 19]);
    expect(plan.firstCycleWeeks).toEqual([3, 10]);
    expect(plan.modules.find((module) => module.id === "decision-making")?.gaps).toContain(
      "Sets, conditions and deduction",
    );
    expect(plan.modules.find((module) => module.id === "situational-judgement")?.courseConclusion)
      .toMatch(/School courses rarely cover UCAT/u);
    expect(plan.nextActionHref).toBe("/exams/ucat/past-papers");
  });

  it("recognises transferable LNAT reading and writing foundations without claiming ability", () => {
    const plan = buildAssessmentPreparationPlan(createAssessmentBackgroundProfile({
      ...base,
      examId: "lnat",
      subjectAreas: ["english-literature"],
      experience: "past-papers",
      weeklyTime: "5-7",
    }));

    expect(plan.modules.every((module) => module.status === "curriculum-transfer")).toBe(true);
    expect(plan.firstCycleHours).toEqual([4, 6]);
    expect(plan.firstCycleWeeks).toEqual([1, 2]);
    expect(plan.modules.flatMap((module) => module.gaps)).toEqual(expect.arrayContaining([
      "Inference, principle and analogy",
      "Prompt choice and scope · 三选一与命题边界",
    ]));
  });

  it("uses conservative foundation checks when a TARA profile shows no related subjects", () => {
    const plan = buildAssessmentPreparationPlan(createAssessmentBackgroundProfile({
      ...base,
      examId: "tara",
      curriculumId: "other",
      subjectAreas: ["other"],
      experience: "new",
      weeklyTime: "under-2",
    }));

    expect(plan.modules.every((module) => module.status === "foundation-check")).toBe(true);
    expect(plan.firstCycleHours).toEqual([14, 21]);
    expect(plan.firstCycleWeeks).toEqual([7, 21]);
    expect(plan.modules.map((module) => module.courseEvidence)).toEqual([
      "No directly relevant course is shown in the current profile",
      "No directly relevant course is shown in the current profile",
      "No directly relevant course is shown in the current profile",
    ]);
  });
});
