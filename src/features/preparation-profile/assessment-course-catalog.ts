export type AssessmentCurriculumId = "a-level" | "ib" | "ap" | "other";

export type AssessmentSubjectArea =
  | "mathematics"
  | "further-mathematics"
  | "english-language"
  | "english-literature"
  | "physics"
  | "chemistry"
  | "biology"
  | "humanities"
  | "social-sciences"
  | "other";

export interface AssessmentCourseOption {
  readonly id: string;
  readonly curriculumId: AssessmentCurriculumId;
  readonly subjectArea: AssessmentSubjectArea;
  readonly labelEn: string;
  readonly labelZh: string;
}

export const ASSESSMENT_CURRICULA: readonly {
  id: AssessmentCurriculumId;
  label: string;
  detail: string;
}[] = [
  { id: "a-level", label: "A-Level / IAL", detail: "按实际 A-Level 或 IAL 学科选择" },
  { id: "ib", label: "IB Diploma", detail: "区分 IBDP 的具体课程与 HL / SL" },
  { id: "ap", label: "AP", detail: "按已经学习或计划完成的 AP 课程选择" },
  { id: "other", label: "其他课程体系", detail: "国内高中、加拿大或其他课程" },
];

export const ASSESSMENT_COURSES = [
  { id: "al-mathematics", curriculumId: "a-level", subjectArea: "mathematics", labelEn: "Mathematics", labelZh: "数学" },
  { id: "al-further-mathematics", curriculumId: "a-level", subjectArea: "further-mathematics", labelEn: "Further Mathematics", labelZh: "进阶数学" },
  { id: "al-english-language", curriculumId: "a-level", subjectArea: "english-language", labelEn: "English Language", labelZh: "英语语言" },
  { id: "al-english-literature", curriculumId: "a-level", subjectArea: "english-literature", labelEn: "English Literature", labelZh: "英语文学" },
  { id: "al-physics", curriculumId: "a-level", subjectArea: "physics", labelEn: "Physics", labelZh: "物理" },
  { id: "al-chemistry", curriculumId: "a-level", subjectArea: "chemistry", labelEn: "Chemistry", labelZh: "化学" },
  { id: "al-biology", curriculumId: "a-level", subjectArea: "biology", labelEn: "Biology", labelZh: "生物" },
  { id: "al-humanities", curriculumId: "a-level", subjectArea: "humanities", labelEn: "History / Geography / Philosophy", labelZh: "历史、地理或哲学" },
  { id: "al-social-sciences", curriculumId: "a-level", subjectArea: "social-sciences", labelEn: "Economics / Psychology / Sociology", labelZh: "经济、心理或社会学" },
  { id: "al-other", curriculumId: "a-level", subjectArea: "other", labelEn: "Another A-Level subject", labelZh: "其他 A-Level 学科" },

  { id: "ib-math-aa-hl", curriculumId: "ib", subjectArea: "further-mathematics", labelEn: "Mathematics: Analysis & Approaches HL", labelZh: "数学分析与方法 HL" },
  { id: "ib-math-aa-sl", curriculumId: "ib", subjectArea: "mathematics", labelEn: "Mathematics: Analysis & Approaches SL", labelZh: "数学分析与方法 SL" },
  { id: "ib-math-ai-hl", curriculumId: "ib", subjectArea: "mathematics", labelEn: "Mathematics: Applications & Interpretation HL", labelZh: "数学应用与解释 HL" },
  { id: "ib-math-ai-sl", curriculumId: "ib", subjectArea: "mathematics", labelEn: "Mathematics: Applications & Interpretation SL", labelZh: "数学应用与解释 SL" },
  { id: "ib-english-a-language-literature", curriculumId: "ib", subjectArea: "english-language", labelEn: "English A: Language & Literature", labelZh: "英语 A：语言与文学" },
  { id: "ib-english-a-literature", curriculumId: "ib", subjectArea: "english-literature", labelEn: "English A: Literature", labelZh: "英语 A：文学" },
  { id: "ib-physics", curriculumId: "ib", subjectArea: "physics", labelEn: "Physics HL / SL", labelZh: "物理 HL / SL" },
  { id: "ib-chemistry", curriculumId: "ib", subjectArea: "chemistry", labelEn: "Chemistry HL / SL", labelZh: "化学 HL / SL" },
  { id: "ib-biology", curriculumId: "ib", subjectArea: "biology", labelEn: "Biology HL / SL", labelZh: "生物 HL / SL" },
  { id: "ib-humanities", curriculumId: "ib", subjectArea: "humanities", labelEn: "History / Geography / Philosophy", labelZh: "历史、地理或哲学" },
  { id: "ib-social-sciences", curriculumId: "ib", subjectArea: "social-sciences", labelEn: "Economics / Psychology / Global Politics", labelZh: "经济、心理或全球政治" },
  { id: "ib-other", curriculumId: "ib", subjectArea: "other", labelEn: "Another IB subject", labelZh: "其他 IB 学科" },

  { id: "ap-precalculus", curriculumId: "ap", subjectArea: "mathematics", labelEn: "AP Precalculus", labelZh: "AP 预备微积分" },
  { id: "ap-calculus-ab", curriculumId: "ap", subjectArea: "mathematics", labelEn: "AP Calculus AB", labelZh: "AP 微积分 AB" },
  { id: "ap-calculus-bc", curriculumId: "ap", subjectArea: "further-mathematics", labelEn: "AP Calculus BC", labelZh: "AP 微积分 BC" },
  { id: "ap-statistics", curriculumId: "ap", subjectArea: "mathematics", labelEn: "AP Statistics", labelZh: "AP 统计学" },
  { id: "ap-english-language", curriculumId: "ap", subjectArea: "english-language", labelEn: "AP English Language & Composition", labelZh: "AP 英语语言与写作" },
  { id: "ap-english-literature", curriculumId: "ap", subjectArea: "english-literature", labelEn: "AP English Literature & Composition", labelZh: "AP 英语文学与写作" },
  { id: "ap-physics-1", curriculumId: "ap", subjectArea: "physics", labelEn: "AP Physics 1", labelZh: "AP 物理 1" },
  { id: "ap-physics-2", curriculumId: "ap", subjectArea: "physics", labelEn: "AP Physics 2", labelZh: "AP 物理 2" },
  { id: "ap-physics-c-mechanics", curriculumId: "ap", subjectArea: "physics", labelEn: "AP Physics C: Mechanics", labelZh: "AP 物理 C：力学" },
  { id: "ap-physics-c-em", curriculumId: "ap", subjectArea: "physics", labelEn: "AP Physics C: Electricity & Magnetism", labelZh: "AP 物理 C：电磁学" },
  { id: "ap-chemistry", curriculumId: "ap", subjectArea: "chemistry", labelEn: "AP Chemistry", labelZh: "AP 化学" },
  { id: "ap-biology", curriculumId: "ap", subjectArea: "biology", labelEn: "AP Biology", labelZh: "AP 生物" },
  { id: "ap-humanities", curriculumId: "ap", subjectArea: "humanities", labelEn: "AP History / Human Geography", labelZh: "AP 历史或人文地理" },
  { id: "ap-social-sciences", curriculumId: "ap", subjectArea: "social-sciences", labelEn: "AP Economics / Psychology / Government", labelZh: "AP 经济、心理或政府" },
  { id: "ap-other", curriculumId: "ap", subjectArea: "other", labelEn: "Another AP course", labelZh: "其他 AP 课程" },

  { id: "other-mathematics", curriculumId: "other", subjectArea: "mathematics", labelEn: "Mathematics", labelZh: "数学" },
  { id: "other-advanced-mathematics", curriculumId: "other", subjectArea: "further-mathematics", labelEn: "Advanced Mathematics", labelZh: "高等或进阶数学" },
  { id: "other-english-language", curriculumId: "other", subjectArea: "english-language", labelEn: "English Language", labelZh: "英语语言" },
  { id: "other-english-literature", curriculumId: "other", subjectArea: "english-literature", labelEn: "English Literature", labelZh: "英语文学" },
  { id: "other-physics", curriculumId: "other", subjectArea: "physics", labelEn: "Physics", labelZh: "物理" },
  { id: "other-chemistry", curriculumId: "other", subjectArea: "chemistry", labelEn: "Chemistry", labelZh: "化学" },
  { id: "other-biology", curriculumId: "other", subjectArea: "biology", labelEn: "Biology", labelZh: "生物" },
  { id: "other-humanities", curriculumId: "other", subjectArea: "humanities", labelEn: "Humanities", labelZh: "人文学科" },
  { id: "other-social-sciences", curriculumId: "other", subjectArea: "social-sciences", labelEn: "Social Sciences", labelZh: "社会科学" },
  { id: "other-subject", curriculumId: "other", subjectArea: "other", labelEn: "Another subject", labelZh: "其他学科" },
] as const satisfies readonly AssessmentCourseOption[];

export type AssessmentCourseId = (typeof ASSESSMENT_COURSES)[number]["id"];

const courseById = new Map<string, AssessmentCourseOption>(
  ASSESSMENT_COURSES.map((course) => [course.id, course]),
);

export function coursesForAssessmentCurriculum(
  curriculumId: AssessmentCurriculumId,
): readonly AssessmentCourseOption[] {
  return ASSESSMENT_COURSES.filter((course) => course.curriculumId === curriculumId);
}

export function assessmentCoursesById(
  courseIds: readonly string[],
): readonly AssessmentCourseOption[] {
  return courseIds.map((courseId) => {
    const course = courseById.get(courseId);
    if (course === undefined) throw new Error(`Unknown assessment course: ${courseId}`);
    return course;
  });
}

export function subjectAreasForAssessmentCourses(
  courseIds: readonly string[],
): readonly AssessmentSubjectArea[] {
  return [...new Set(assessmentCoursesById(courseIds).map((course) => course.subjectArea))];
}

export function legacyCourseIdsForSubjectAreas(
  curriculumId: AssessmentCurriculumId,
  subjectAreas: readonly AssessmentSubjectArea[],
): readonly AssessmentCourseId[] {
  const available = coursesForAssessmentCurriculum(curriculumId);
  return subjectAreas.map((subjectArea) => {
    const course = available.find((candidate) => candidate.subjectArea === subjectArea);
    if (course === undefined) throw new Error(`No ${curriculumId} course represents ${subjectArea}`);
    return course.id as AssessmentCourseId;
  });
}

export function assertAssessmentCoursesMatchCurriculum(
  curriculumId: AssessmentCurriculumId,
  courseIds: readonly string[],
): asserts courseIds is readonly AssessmentCourseId[] {
  if (
    courseIds.length === 0 ||
    courseIds.length > coursesForAssessmentCurriculum(curriculumId).length ||
    new Set(courseIds).size !== courseIds.length ||
    assessmentCoursesById(courseIds).some((course) => course.curriculumId !== curriculumId)
  ) {
    throw new Error("Assessment courses must be unique and belong to the selected curriculum");
  }
}
