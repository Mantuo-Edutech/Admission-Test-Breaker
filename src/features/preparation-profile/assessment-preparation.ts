import {
  ASSESSMENT_CURRICULA,
  ASSESSMENT_LEARNING_STAGES,
  ASSESSMENT_SUBJECT_AREAS,
  ASSESSMENT_WEEKLY_TIME_OPTIONS,
  type AssessmentBackgroundProfile,
  type AssessmentProfileExamId,
  type AssessmentSubjectArea,
} from "./assessment-profile-domain.js";

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
      transferableConclusion: "阅读与人文学科背景可以迁移，但结论、假设、论证缺陷和证据强度仍需要按 TARA 题型训练。",
      foundationConclusion: "课程档案未显示直接的论证分析训练；先补结论、理由、假设和反例四项基础，再进入限时题。",
      gaps: ["结论、理由与隐含假设 · Conclusions, reasons and assumptions", "证据强弱与替代解释 · Evidence strength and alternative explanations", "论证缺陷与必要/充分条件 · Flaws, necessary and sufficient conditions"],
      practiceHref: "/practice/tara-reasoning-starter-v1",
      practiceLabel: "开始批判思维短诊断",
    },
    {
      id: "problem-solving",
      name: "Problem Solving",
      nameZh: "问题解决",
      relevantSubjects: ["mathematics", "further-mathematics", "physics"],
      transferableConclusion: "数量与物理课程可以迁移；仍需练习约束排序、图表信息和陌生情境中的快速建模。",
      foundationConclusion: "课程档案未显示直接的数量推理背景；先复习比例、百分比、集合、速率和表格读取。",
      gaps: ["比例、百分比与速率 · Ratios, percentages and rates", "约束排序与集合关系 · Constraints, ordering and sets", "表格、图形与信息筛选 · Tables, diagrams and information selection"],
      practiceHref: "/practice/tara-reasoning-starter-v1",
      practiceLabel: "开始问题解决短诊断",
    },
    {
      id: "writing-task",
      name: "Writing Task",
      nameZh: "限时论证写作",
      relevantSubjects: ["english-language", "english-literature", "humanities", "social-sciences"],
      transferableConclusion: "议论文课程可以迁移；仍需适应 40 分钟内审题、反方处理和 750 词上限。",
      foundationConclusion: "课程档案未显示直接的英文论证写作背景；先建立立场、理由、反方和结论的四段骨架。",
      gaps: ["准确解释命题 · Interpreting the proposition", "立场、反方与权衡 · Position, counterargument and trade-offs", "40 分钟提纲、成文与检查 · Planning, drafting and checking in 40 minutes"],
      practiceHref: "/practice/tara-writing-task-v1",
      practiceLabel: "开始限时写作",
    },
  ],
  lnat: [
    {
      id: "section-a",
      name: "Section A",
      nameZh: "文章阅读与论证推理",
      relevantSubjects: ["english-language", "english-literature", "humanities", "social-sciences"],
      transferableConclusion: "英文阅读与人文学科背景可以迁移；仍需按文章组训练主旨、推论、论证作用和时间分配。",
      foundationConclusion: "课程档案未显示直接的长篇英文论证阅读背景；先建立段落作用、作者立场和证据关系的阅读框架。",
      gaps: ["主结论、段落作用与作者态度 · Main conclusion, paragraph role and stance", "推论、原则与类比 · Inference, principle and analogy", "12 篇材料的阅读节奏 · Pacing across twelve passages"],
      practiceHref: "/practice/lnat-section-a-starter-v1",
      practiceLabel: "开始 Section A 短诊断",
    },
    {
      id: "section-b",
      name: "Section B",
      nameZh: "限时论证写作",
      relevantSubjects: ["english-language", "english-literature", "humanities", "social-sciences"],
      transferableConclusion: "英文议论文背景可以迁移；仍需训练三选一决策、清晰取舍和 40 分钟成文。",
      foundationConclusion: "课程档案未显示直接的英文议论文训练；先建立审题、提纲、反方和结论的稳定写作流程。",
      gaps: ["三选一与命题边界 · Prompt choice and scope", "可辩护立场与反方处理 · Defensible position and counterargument", "500–600 词的结构与检查 · Structure and checking at 500–600 words"],
      practiceHref: "/practice/lnat-section-b-writing-v1",
      practiceLabel: "开始 Section B 写作",
    },
  ],
  ucat: [
    {
      id: "verbal-reasoning",
      name: "Verbal Reasoning",
      nameZh: "文字推理",
      relevantSubjects: ["english-language", "english-literature", "humanities", "social-sciences"],
      transferableConclusion: "英文阅读背景可以迁移；仍需训练只依据文段作答、快速定位和极短单题时间。",
      foundationConclusion: "课程档案未显示直接的英文长文阅读背景；先检查词汇负担、定位速度和事实/推论区分。",
      gaps: ["只依据文段判断 · Reasoning only from the passage", "事实、推论与作者观点 · Fact, inference and author view", "高速定位与放弃策略 · Rapid retrieval and skip strategy"],
      practiceHref: "/practice/ucat-verbal-reasoning-starter-v1",
      practiceLabel: "开始文字推理短诊断",
    },
    {
      id: "decision-making",
      name: "Decision Making",
      nameZh: "决策判断",
      relevantSubjects: ["mathematics", "further-mathematics", "physics", "social-sciences"],
      transferableConclusion: "数学或数据推理背景可以迁移；形式逻辑、论证判断和五陈述计分仍是考试专属。",
      foundationConclusion: "课程档案未显示直接的数学或数据推理背景；先补集合、概率、条件关系和论证判断。",
      gaps: ["集合、条件与演绎逻辑 · Sets, conditions and deduction", "概率、数据与决策 · Probability, data and decisions", "五陈述 Yes/No 完整作答 · Complete five-statement responses"],
      practiceHref: "/practice/ucat-decision-making-starter-v1",
      practiceLabel: "开始决策判断短诊断",
    },
    {
      id: "quantitative-reasoning",
      name: "Quantitative Reasoning",
      nameZh: "数量推理",
      relevantSubjects: ["mathematics", "further-mathematics", "physics", "chemistry"],
      transferableConclusion: "数量课程可以迁移；仍需训练数据表读取、估算、基础计算器和限时选择。",
      foundationConclusion: "课程档案未显示直接的数量学科背景；先复习四则运算、比例、百分比、单位和图表。",
      gaps: ["比例、百分比与单位换算 · Ratios, percentages and units", "表格与图形信息提取 · Extracting data from tables and charts", "估算、计算器与时间决策 · Estimation, calculator and time decisions"],
      practiceHref: "/practice/ucat-quantitative-reasoning-starter-v1",
      practiceLabel: "开始数量推理短诊断",
    },
    {
      id: "situational-judgement",
      name: "Situational Judgement",
      nameZh: "情境判断",
      relevantSubjects: [],
      transferableConclusion: "",
      foundationConclusion: "学校课程通常不直接覆盖 UCAT 职业情境判断；所有学生都需要单独学习关键性、适当性和专业行为原则。",
      gaps: ["关键性与适当性两种问题 · Importance and appropriateness", "患者安全、诚实与团队沟通 · Safety, honesty and team communication", "相邻等级与一致判断 · Adjacent categories and consistent judgement"],
      practiceHref: "/practice/ucat-situational-judgement-starter-v1",
      practiceLabel: "开始情境判断短诊断",
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

function labelForSubject(subject: AssessmentSubjectArea): string {
  const definition = ASSESSMENT_SUBJECT_AREAS.find((item) => item.id === subject);
  if (definition === undefined) throw new Error(`Missing assessment subject label: ${subject}`);
  return `${definition.labelEn} · ${definition.label}`;
}

function moduleFromBlueprint(
  blueprint: ModuleBlueprint,
  profile: AssessmentBackgroundProfile,
): AssessmentPreparationModule {
  const matchedSubjects = profile.subjectAreas.filter((subject) => blueprint.relevantSubjects.includes(subject));
  const status: AssessmentPreparationStatus = blueprint.alwaysExamSpecific === true
    ? "exam-specific"
    : matchedSubjects.length > 0
      ? "curriculum-transfer"
      : "foundation-check";
  const statusLabel = status === "curriculum-transfer"
    ? "已有课程可迁移 · Transferable foundation"
    : status === "exam-specific"
      ? "课程通常不覆盖 · Exam-specific"
      : "先检查基础缺口 · Foundation check";
  const courseEvidence = status === "exam-specific"
    ? "所有课程体系"
    : matchedSubjects.length > 0
      ? matchedSubjects.map(labelForSubject).join("、")
      : "当前档案没有显示直接相关学科";
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
    subjectLabels: profile.subjectAreas.map(labelForSubject),
    modules,
    firstCycleHours: [minHours, maxHours],
    firstCycleWeeks: [minWeeks, maxWeeks],
    nextActionHref: `/exams/${profile.examId}/past-papers`,
    nextActionLabel: `进入 ${profile.examId.toUpperCase()} 免费在线练习`,
  };
}
