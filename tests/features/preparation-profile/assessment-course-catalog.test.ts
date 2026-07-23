import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_COURSES,
  coursesForAssessmentCurriculum,
  subjectAreasForAssessmentCourses,
} from "../../../src/features/preparation-profile/assessment-course-catalog.js";
import { createAssessmentBackgroundProfile } from "../../../src/features/preparation-profile/assessment-profile-domain.js";

describe("curriculum-specific assessment course catalogue", () => {
  it("defines a distinct, non-empty course set for every supported curriculum", () => {
    expect(new Set(ASSESSMENT_COURSES.map((course) => course.id)).size).toBe(ASSESSMENT_COURSES.length);

    for (const curriculumId of ["a-level", "ib", "ap", "other"] as const) {
      const courses = coursesForAssessmentCurriculum(curriculumId);
      expect(courses.length).toBeGreaterThanOrEqual(10);
      expect(courses.every((course) => course.curriculumId === curriculumId)).toBe(true);
      expect(courses.every((course) => course.labelEn.length > 0 && course.labelZh.length > 0)).toBe(true);
    }

    expect(coursesForAssessmentCurriculum("ib").map((course) => course.id)).toContain("ib-math-aa-hl");
    expect(coursesForAssessmentCurriculum("ap").map((course) => course.id)).toContain("ap-physics-c-em");
    expect(coursesForAssessmentCurriculum("a-level").map((course) => course.id)).toContain("al-further-mathematics");
  });

  it("derives broad preparation evidence from exact courses without losing course identity", () => {
    expect(subjectAreasForAssessmentCourses(["ap-calculus-bc", "ap-physics-c-mechanics"]))
      .toEqual(["further-mathematics", "physics"]);

    const profile = createAssessmentBackgroundProfile({
      guestSpaceId: "gsp_course-catalog-test",
      examId: "tara",
      entryCycle: "2027",
      curriculumId: "ap",
      learningStage: "year-12",
      subjectAreas: ["further-mathematics", "physics"],
      courseIds: ["ap-calculus-bc", "ap-physics-c-mechanics"],
      experience: "new",
      weeklyTime: "2-4",
      createdAt: "2026-07-23T08:00:00.000Z",
      updatedAt: "2026-07-23T08:00:00.000Z",
    });

    expect(profile.courseIds).toEqual(["ap-calculus-bc", "ap-physics-c-mechanics"]);
    expect(() => createAssessmentBackgroundProfile({
      guestSpaceId: profile.guestSpaceId,
      examId: profile.examId,
      entryCycle: profile.entryCycle,
      curriculumId: "ib",
      learningStage: profile.learningStage,
      subjectAreas: profile.subjectAreas,
      courseIds: profile.courseIds,
      experience: profile.experience,
      weeklyTime: profile.weeklyTime,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    })).toThrow(/selected curriculum/u);
  });
});
