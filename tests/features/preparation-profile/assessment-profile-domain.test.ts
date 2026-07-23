import { describe, expect, it } from "vitest";
import { createAssessmentBackgroundProfile } from "../../../src/features/preparation-profile/assessment-profile-domain.js";

const base = {
  guestSpaceId: "gsp_assessment-domain-test",
  examId: "ucat" as const,
  entryCycle: "2027" as const,
  curriculumId: "a-level" as const,
  learningStage: "year-12" as const,
  subjectAreas: ["mathematics", "biology"] as const,
  experience: "sampled" as const,
  weeklyTime: "2-4" as const,
  createdAt: "2026-07-18T12:00:00.000Z",
  updatedAt: "2026-07-18T12:00:00.000Z",
};

describe("assessment background profile domain", () => {
  it("creates a minimal, exam-scoped student-owned profile", () => {
    expect(createAssessmentBackgroundProfile(base)).toEqual({
      schemaVersion: 2,
      ...base,
      courseIds: ["al-mathematics", "al-biology"],
    });
  });

  it("requires at least one unique supported subject", () => {
    expect(() => createAssessmentBackgroundProfile({ ...base, subjectAreas: [] })).toThrow(
      /unique supported subject/u,
    );
    expect(() => createAssessmentBackgroundProfile({
      ...base,
      subjectAreas: ["biology", "biology"],
    })).toThrow(/unique supported subject/u);
  });

  it("rejects unsupported exams and non-canonical timestamps", () => {
    expect(() => createAssessmentBackgroundProfile({
      ...base,
      examId: "tmua" as never,
    })).toThrow(/exam is unsupported/u);
    expect(() => createAssessmentBackgroundProfile({
      ...base,
      updatedAt: "18 July 2026",
    })).toThrow(/canonical UTC/u);
  });
});
