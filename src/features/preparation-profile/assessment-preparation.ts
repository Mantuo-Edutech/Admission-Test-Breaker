import {
  ASSESSMENT_CURRICULA,
  ASSESSMENT_LEARNING_STAGES,
  ASSESSMENT_WEEKLY_TIME_OPTIONS,
  type AssessmentBackgroundProfile,
  type AssessmentProfileExamId,
  type AssessmentSubjectArea,
} from "./assessment-profile-domain.js";
import {
  assessmentCoursesById,
  legacyCourseIdsForSubjectAreas,
  type AssessmentCourseOption,
} from "./assessment-course-catalog.js";

export type AssessmentPreparationStatus =
  | "curriculum-transfer"
  | "foundation-check"
  | "exam-specific";

export interface AssessmentPreparationModule {
  readonly id: string;
  readonly name: string;
  readonly nameZh: string;
  readonly status: AssessmentPreparationStatus;
  readonly statusLabel: string;
  readonly courseEvidence: string;
  readonly courseConclusion: string;
  readonly gaps: readonly string[];
  readonly suggestedHours: readonly [number, number];
  readonly practiceHref: string;
  readonly practiceLabel: string;
}

export interface AssessmentPreparationPlan {
  readonly schemaVersion: 1;
  readonly examId: AssessmentProfileExamId;
  readonly curriculumLabel: string;
  readonly learningStageLabel: string;
  readonly weeklyTimeLabel: string;
  readonly subjectLabels: readonly string[];
  readonly modules: readonly AssessmentPreparationModule[];
  readonly firstCycleHours: readonly [number, number];
  readonly firstCycleWeeks: readonly [number, number];
  readonly nextActionHref: string;
  readonly nextActionLabel: string;
}

interface ModuleBlueprint {
  readonly id: string;
  readonly name: string;
  readonly nameZh: string;
  readonly relevantSubjects: readonly AssessmentSubjectArea[];
  readonly transferableConclusion: string;
  readonly foundationConclusion: string;
  readonly gaps: readonly string[];
  readonly practiceHref: string;
  readonly practiceLabel: string;
  readonly alwaysExamSpecific?: boolean;
}

const BLUEPRINTS: Readonly<Record<AssessmentProfileExamId, readonly ModuleBlueprint[]>> = {
  tara: [
    {
      id: "critical-thinking",
      name: "Critical Thinking",
      nameZh: "批判思维",
      relevantSubjects: ["english-language", "english-literature", "humanities", "social-sciences"],
      transferableConclusion: "Your reading and humanities background transfers well, but TARA still requires precise work on conclusions, assumptions, flaws and evidence strength.",
      foundationConclusion: "Your course profile shows no direct argument-analysis training. Build conclusions, reasons, assumptions and counterexamples before timed work.",
      gaps: ["Conclusions, reasons and assumptions", "Evidence strength and alternative explanations", "Flaws, necessary and sufficient conditions"],
      practiceHref: "/practice/tara-critical-thinking-full-mock-v1",
      practiceLabel: "Start the Critical Thinking full mock",
    },
    {
      id: "problem-solving",
      name: "Problem Solving",
      nameZh: "问题解决",
      relevantSubjects: ["mathematics", "further-mathematics", "physics"],
      transferableConclusion: "Your quantitative and physics courses transfer well. Add constraint ordering, diagram reading and rapid modelling in unfamiliar contexts.",
      foundationConclusion: "Your course profile shows no direct quantitative-reasoning background. Review ratios, percentages, sets, rates and tables first.",
      gaps: ["Ratios, percentages and rates", "Constraints, ordering and sets", "Tables, diagrams and information selection"],
      practiceHref: "/practice/tara-problem-solving-full-mock-v1",
      practiceLabel: "Start the Problem Solving full mock",
    },
    {
      id: "writing-task",
      name: "Writing Task",
      nameZh: "限时论证写作",
      relevantSubjects: ["english-language", "english-literature", "humanities", "social-sciences"],
      transferableConclusion: "Your argumentative-writing background transfers well. Add rapid prompt interpretation, counterargument handling and a complete response within the 40-minute, 750-word limit.",
      foundationConclusion: "Your course profile shows no direct English argumentative-writing background. Build a reliable structure around position, reasons, counterargument and conclusion before timed work.",
      gaps: ["Interpreting the proposition · 准确解释命题", "Position, counterargument and trade-offs · 立场、反方与权衡", "Planning, drafting and checking in 40 minutes · 40 分钟提纲、成文与检查"],
      practiceHref: "/practice/tara-writing-task-v1",
      practiceLabel: "Start the full writing task",
    },
  ],
  lnat: [
    {
      id: "section-a",
      name: "Section A",
      nameZh: "文章阅读与论证推理",
      relevantSubjects: ["english-language", "english-literature", "humanities", "social-sciences"],
      transferableConclusion: "Your English reading and humanities background transfers well. Add passage-based work on main claims, inference, argument roles and pacing.",
      foundationConclusion: "Your course profile shows no direct long-form argument reading. Build a framework for paragraph roles, author stance and evidence relationships.",
      gaps: ["Main conclusion, paragraph role and stance", "Inference, principle and analogy", "Pacing across twelve passages"],
      practiceHref: "/practice/lnat-section-a-full-mock-v1",
      practiceLabel: "Start the Section A full mock",
    },
    {
      id: "section-b",
      name: "Section B",
      nameZh: "限时论证写作",
      relevantSubjects: ["english-language", "english-literature", "humanities", "social-sciences"],
      transferableConclusion: "Your English argumentative-writing background transfers well. Add fast prompt selection, explicit trade-offs and a complete response within 40 minutes.",
      foundationConclusion: "Your course profile shows no direct English argumentative-writing background. Build a stable process for interpreting the prompt, planning, counterargument and conclusion before timed work.",
      gaps: ["Prompt choice and scope · 三选一与命题边界", "Defensible position and counterargument · 可辩护立场与反方处理", "Structure and checking at 500–600 words · 500–600 词的结构与检查"],
      practiceHref: "/practice/lnat-section-b-writing-v1",
      practiceLabel: "Start the Section B writing task",
    },
  ],
  ucat: [
    {
      id: "verbal-reasoning",
      name: "Verbal Reasoning",
      nameZh: "文字推理",
      relevantSubjects: ["english-language", "english-literature", "humanities", "social-sciences"],
      transferableConclusion: "Your English reading background transfers well. Add passage-only reasoning, rapid retrieval and strict per-question pacing.",
      foundationConclusion: "Your course profile shows no direct long-form English reading. Check vocabulary load, retrieval speed and fact-versus-inference decisions.",
      gaps: ["Reasoning only from the passage", "Fact, inference and author view", "Rapid retrieval and skip strategy"],
      practiceHref: "/practice/ucat-verbal-reasoning-full-mock-v1",
      practiceLabel: "Start the Verbal Reasoning full mock",
    },
    {
      id: "decision-making",
      name: "Decision Making",
      nameZh: "决策判断",
      relevantSubjects: ["mathematics", "further-mathematics", "physics", "social-sciences"],
      transferableConclusion: "Your mathematics or data-reasoning background transfers well. Formal logic, argument judgement and five-statement scoring remain test-specific.",
      foundationConclusion: "Your course profile shows no direct mathematics or data-reasoning background. Review sets, probability, conditional relationships and argument judgement.",
      gaps: ["Sets, conditions and deduction", "Probability, data and decisions", "Complete five-statement responses"],
      practiceHref: "/practice/ucat-decision-making-full-mock-v1",
      practiceLabel: "Start the Decision Making full mock",
    },
    {
      id: "quantitative-reasoning",
      name: "Quantitative Reasoning",
      nameZh: "数量推理",
      relevantSubjects: ["mathematics", "further-mathematics", "physics", "chemistry"],
      transferableConclusion: "Your quantitative courses transfer well. Add rapid table reading, estimation, basic-calculator use and timed decisions.",
      foundationConclusion: "Your course profile shows no direct quantitative background. Review arithmetic, ratios, percentages, units and charts first.",
      gaps: ["Ratios, percentages and units", "Extracting data from tables and charts", "Estimation, calculator and time decisions"],
      practiceHref: "/practice/ucat-quantitative-reasoning-full-mock-v1",
      practiceLabel: "Start the Quantitative Reasoning full mock",
    },
    {
      id: "situational-judgement",
      name: "Situational Judgement",
      nameZh: "情境判断",
      relevantSubjects: [],
      transferableConclusion: "",
      foundationConclusion: "School courses rarely cover UCAT professional judgement directly. Every learner needs explicit work on importance, appropriateness and professional behaviour.",
      gaps: ["Importance and appropriateness", "Safety, honesty and team communication", "Adjacent categories and consistent judgement"],
      practiceHref: "/practice/ucat-situational-judgement-full-mock-v1",
      practiceLabel: "Start the Situational Judgement full mock",
      alwaysExamSpecific: true,
    },
  ],
};

const hoursByStatus: Readonly<Record<AssessmentPreparationStatus, readonly [number, number]>> = {
  "curriculum-transfer": [2, 3],
  "foundation-check": [4, 6],
  "exam-specific": [3, 5],
};

const weeklyRanges = {
  "under-2": [1, 2],
  "2-4": [2, 4],
  "5-7": [5, 7],
  "8-plus": [8, 10],
} as const;

const experienceAllowance = {
  new: [2, 3],
  sampled: [1, 2],
  mocked: [0, 1],
  "past-papers": [0, 0],
} as const;

function coursesForProfile(profile: AssessmentBackgroundProfile): readonly AssessmentCourseOption[] {
  const courseIds = profile.schemaVersion === 2
    ? profile.courseIds
    : legacyCourseIdsForSubjectAreas(profile.curriculumId, profile.subjectAreas);
  return assessmentCoursesById(courseIds);
}

function labelForCourse(course: AssessmentCourseOption): string {
  return `${course.labelEn} · ${course.labelZh}`;
}

function moduleFromBlueprint(
  blueprint: ModuleBlueprint,
  profile: AssessmentBackgroundProfile,
): AssessmentPreparationModule {
  const matchedCourses = coursesForProfile(profile).filter((course) =>
    blueprint.relevantSubjects.includes(course.subjectArea));
  const status: AssessmentPreparationStatus = blueprint.alwaysExamSpecific === true
    ? "exam-specific"
    : matchedCourses.length > 0
      ? "curriculum-transfer"
      : "foundation-check";
  const statusLabel = status === "curriculum-transfer"
    ? "Transferable foundation · 已有课程可迁移"
    : status === "exam-specific"
      ? "Exam-specific · 课程通常不覆盖"
      : "Foundation check · 先检查基础缺口";
  const courseEvidence = status === "exam-specific"
    ? "All curricula"
    : matchedCourses.length > 0
      ? matchedCourses.map(labelForCourse).join("、")
      : "No directly relevant course is shown in the current profile";
  return {
    id: blueprint.id,
    name: blueprint.name,
    nameZh: blueprint.nameZh,
    status,
    statusLabel,
    courseEvidence,
    courseConclusion: status === "curriculum-transfer"
      ? blueprint.transferableConclusion
      : blueprint.foundationConclusion,
    gaps: blueprint.gaps,
    suggestedHours: hoursByStatus[status],
    practiceHref: blueprint.practiceHref,
    practiceLabel: blueprint.practiceLabel,
  };
}

export function buildAssessmentPreparationPlan(
  profile: AssessmentBackgroundProfile,
): AssessmentPreparationPlan {
  const curriculum = ASSESSMENT_CURRICULA.find((item) => item.id === profile.curriculumId);
  const stage = ASSESSMENT_LEARNING_STAGES.find((item) => item.id === profile.learningStage);
  const weekly = ASSESSMENT_WEEKLY_TIME_OPTIONS.find((item) => item.id === profile.weeklyTime);
  if (curriculum === undefined || stage === undefined || weekly === undefined) {
    throw new Error("Assessment preparation profile labels are incomplete");
  }
  const modules = BLUEPRINTS[profile.examId].map((blueprint) => moduleFromBlueprint(blueprint, profile));
  const allowance = experienceAllowance[profile.experience];
  const minHours = modules.reduce<number>((sum, module) => sum + module.suggestedHours[0], allowance[0]);
  const maxHours = modules.reduce<number>((sum, module) => sum + module.suggestedHours[1], allowance[1]);
  const weeklyRange = weeklyRanges[profile.weeklyTime];
  const minWeeks = Math.max(1, Math.ceil(minHours / weeklyRange[1]));
  const maxWeeks = Math.max(minWeeks, Math.ceil(maxHours / weeklyRange[0]));
  return {
    schemaVersion: 1,
    examId: profile.examId,
    curriculumLabel: curriculum.label,
    learningStageLabel: stage.label,
    weeklyTimeLabel: weekly.label,
    subjectLabels: coursesForProfile(profile).map(labelForCourse),
    modules,
    firstCycleHours: [minHours, maxHours],
    firstCycleWeeks: [minWeeks, maxWeeks],
    nextActionHref: `/exams/${profile.examId}/past-papers`,
    nextActionLabel: `Open ${profile.examId.toUpperCase()} online practice`,
  };
}
