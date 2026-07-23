import {
  asGuestSpaceId,
  assertCanonicalUtcTimestamp,
  type GuestSpaceId,
} from "../../platform/shared/ids.js";
import {
  ASSESSMENT_CURRICULA,
  ASSESSMENT_COURSES,
  assertAssessmentCoursesMatchCurriculum,
  legacyCourseIdsForSubjectAreas,
  subjectAreasForAssessmentCourses,
  type AssessmentCourseId,
  type AssessmentCurriculumId,
  type AssessmentSubjectArea,
} from "./assessment-course-catalog.js";

export {
  ASSESSMENT_CURRICULA,
  ASSESSMENT_COURSES,
  coursesForAssessmentCurriculum,
} from "./assessment-course-catalog.js";
export type {
  AssessmentCourseId,
  AssessmentCurriculumId,
  AssessmentSubjectArea,
} from "./assessment-course-catalog.js";

export type AssessmentProfileExamId = "tara" | "lnat" | "ucat";
export type AssessmentLearningStage = "year-11-or-below" | "year-12" | "year-13" | "gap-year" | "university";
export type AssessmentWeeklyTime = "under-2" | "2-4" | "5-7" | "8-plus";
export type AssessmentPreparationExperience = "new" | "sampled" | "mocked" | "past-papers";

interface AssessmentBackgroundProfileBase {
  readonly guestSpaceId: GuestSpaceId;
  readonly examId: AssessmentProfileExamId;
  readonly entryCycle: "2027" | "2028";
  readonly curriculumId: AssessmentCurriculumId;
  readonly learningStage: AssessmentLearningStage;
  readonly subjectAreas: readonly AssessmentSubjectArea[];
  readonly experience: AssessmentPreparationExperience;
  readonly weeklyTime: AssessmentWeeklyTime;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LegacyAssessmentBackgroundProfile extends AssessmentBackgroundProfileBase {
  readonly schemaVersion: 1;
}

export interface AssessmentBackgroundProfileV2 extends AssessmentBackgroundProfileBase {
  readonly schemaVersion: 2;
  readonly courseIds: readonly AssessmentCourseId[];
}

export type AssessmentBackgroundProfile = LegacyAssessmentBackgroundProfile | AssessmentBackgroundProfileV2;

export type CreateAssessmentBackgroundProfileInput = Omit<AssessmentBackgroundProfileBase, "guestSpaceId"> & {
  readonly guestSpaceId: string;
  readonly courseIds?: readonly string[];
};

export const ASSESSMENT_LEARNING_STAGES: readonly { id: AssessmentLearningStage; label: string }[] = [
  { id: "year-11-or-below", label: "Year 11 或以下" },
  { id: "year-12", label: "Year 12" },
  { id: "year-13", label: "Year 13" },
  { id: "gap-year", label: "Gap year / 已毕业" },
  { id: "university", label: "大学在读" },
];

export const ASSESSMENT_SUBJECT_AREAS: readonly { id: AssessmentSubjectArea; label: string; labelEn: string }[] = [
  { id: "mathematics", label: "数学", labelEn: "Mathematics" },
  { id: "further-mathematics", label: "进阶数学", labelEn: "Further Mathematics" },
  { id: "english-language", label: "英语语言", labelEn: "English Language" },
  { id: "english-literature", label: "英语文学", labelEn: "English Literature" },
  { id: "physics", label: "物理", labelEn: "Physics" },
  { id: "chemistry", label: "化学", labelEn: "Chemistry" },
  { id: "biology", label: "生物", labelEn: "Biology" },
  { id: "humanities", label: "人文学科", labelEn: "Humanities" },
  { id: "social-sciences", label: "社会科学", labelEn: "Social Sciences" },
  { id: "other", label: "其他", labelEn: "Other" },
];

export const ASSESSMENT_EXPERIENCE_OPTIONS: readonly { id: AssessmentPreparationExperience; label: string }[] = [
  { id: "new", label: "还没有做过题" },
  { id: "sampled", label: "看过或做过少量样题" },
  { id: "mocked", label: "完成过至少一次限时练习" },
  { id: "past-papers", label: "已经系统训练或完成多套练习" },
];

export const ASSESSMENT_WEEKLY_TIME_OPTIONS: readonly { id: AssessmentWeeklyTime; label: string }[] = [
  { id: "under-2", label: "每周少于 2 小时" },
  { id: "2-4", label: "每周 2–4 小时" },
  { id: "5-7", label: "每周 5–7 小时" },
  { id: "8-plus", label: "每周 8 小时以上" },
];

const examIds = new Set<AssessmentProfileExamId>(["tara", "lnat", "ucat"]);
const curriculumIds = new Set(ASSESSMENT_CURRICULA.map((option) => option.id));
const stageIds = new Set(ASSESSMENT_LEARNING_STAGES.map((option) => option.id));
const subjectIds = new Set(ASSESSMENT_SUBJECT_AREAS.map((option) => option.id));
const experienceIds = new Set(ASSESSMENT_EXPERIENCE_OPTIONS.map((option) => option.id));
const weeklyTimeIds = new Set(ASSESSMENT_WEEKLY_TIME_OPTIONS.map((option) => option.id));

export function createAssessmentBackgroundProfile(
  input: CreateAssessmentBackgroundProfileInput,
): AssessmentBackgroundProfileV2 {
  const guestSpaceId = asGuestSpaceId(input.guestSpaceId);
  if (!examIds.has(input.examId)) throw new Error("Assessment profile exam is unsupported");
  if (input.entryCycle !== "2027" && input.entryCycle !== "2028") throw new Error("Assessment profile entry cycle is unsupported");
  if (!curriculumIds.has(input.curriculumId)) throw new Error("Assessment profile curriculum is unsupported");
  if (!stageIds.has(input.learningStage)) throw new Error("Assessment profile learning stage is unsupported");
  if (!experienceIds.has(input.experience)) throw new Error("Assessment profile experience is unsupported");
  if (!weeklyTimeIds.has(input.weeklyTime)) throw new Error("Assessment profile weekly time is unsupported");
  if (
    !Array.isArray(input.subjectAreas) ||
    input.subjectAreas.length === 0 ||
    input.subjectAreas.length > ASSESSMENT_SUBJECT_AREAS.length ||
    new Set(input.subjectAreas).size !== input.subjectAreas.length ||
    input.subjectAreas.some((subject) => !subjectIds.has(subject))
  ) {
    throw new Error("Assessment profile requires unique supported subject areas");
  }
  assertCanonicalUtcTimestamp(input.createdAt, "Assessment profile createdAt");
  assertCanonicalUtcTimestamp(input.updatedAt, "Assessment profile updatedAt");
  if (Date.parse(input.updatedAt) < Date.parse(input.createdAt)) {
    throw new Error("Assessment profile updatedAt cannot precede createdAt");
  }
  const courseIds = input.courseIds === undefined
    ? legacyCourseIdsForSubjectAreas(input.curriculumId, input.subjectAreas)
    : [...input.courseIds];
  assertAssessmentCoursesMatchCurriculum(input.curriculumId, courseIds);
  const derivedSubjectAreas = subjectAreasForAssessmentCourses(courseIds);
  if (
    derivedSubjectAreas.length !== input.subjectAreas.length ||
    derivedSubjectAreas.some((subjectArea) => !input.subjectAreas.includes(subjectArea))
  ) {
    throw new Error("Assessment subject areas must match the selected curriculum courses");
  }
  return {
    schemaVersion: 2,
    guestSpaceId,
    examId: input.examId,
    entryCycle: input.entryCycle,
    curriculumId: input.curriculumId,
    learningStage: input.learningStage,
    subjectAreas: [...input.subjectAreas],
    courseIds,
    experience: input.experience,
    weeklyTime: input.weeklyTime,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
