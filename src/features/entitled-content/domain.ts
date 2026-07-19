export const TMUA_SIX_WEEK_PLAN_RESOURCE_ID = "tmua-six-week-review-plan-v1";
export const TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID =
  "tmua-specimen-p1-worked-explanations-v1";

export interface BilingualPrinciple {
  readonly titleZh: string;
  readonly titleEn: string;
  readonly bodyZh: string;
}

export interface PlanStep {
  readonly minutes: number;
  readonly actionZh: string;
  readonly detailZh: string;
  readonly evidenceZh: string;
}

export interface PlanSession {
  readonly day: string;
  readonly minutes: number;
  readonly titleZh: string;
  readonly actionsZh: readonly string[];
  readonly evidenceZh: string;
}

export interface WeeklyPlan {
  readonly week: number;
  readonly titleZh: string;
  readonly titleEn: string;
  readonly purposeZh: string;
  readonly targetHours: string;
  readonly sessions: readonly PlanSession[];
  readonly exitCriteriaZh: readonly string[];
}

export interface ErrorCode {
  readonly code: string;
  readonly nameZh: string;
  readonly nameEn: string;
  readonly signalZh: string;
  readonly nextActionZh: string;
}

export interface CurriculumAdjustment {
  readonly curriculum: string;
  readonly guidanceZh: string;
}

export interface TmuaSixWeekPlan {
  readonly schemaVersion: 1;
  readonly id: typeof TMUA_SIX_WEEK_PLAN_RESOURCE_ID;
  readonly edition: string;
  readonly publicationStatus: "published";
  readonly titleZh: string;
  readonly titleEn: string;
  readonly subtitleZh: string;
  readonly subtitleEn: string;
  readonly authorship: string;
  readonly audienceZh: string;
  readonly rightsNotice: string;
  readonly principles: readonly BilingualPrinciple[];
  readonly preflight: {
    readonly titleZh: string;
    readonly titleEn: string;
    readonly steps: readonly PlanStep[];
  };
  readonly weeklyPlan: readonly WeeklyPlan[];
  readonly errorCodebook: readonly ErrorCode[];
  readonly curriculumAdjustments: readonly CurriculumAdjustment[];
  readonly weeklyReview: {
    readonly titleZh: string;
    readonly titleEn: string;
    readonly questionsZh: readonly string[];
  };
  readonly benchmarkBoundary: {
    readonly titleZh: string;
    readonly titleEn: string;
    readonly bodyZh: string;
  };
}

export interface WorkedExplanationStep {
  readonly titleZh: string;
  readonly bodyZh: string;
  readonly math?: string;
}

export interface WorkedExplanation {
  readonly questionId: string;
  readonly number: number;
  readonly correctAnswer: string;
  readonly topicZh: string;
  readonly topicEn: string;
  readonly methodZh: string;
  readonly methodEn: string;
  readonly keyIdeaZh: string;
  readonly steps: readonly WorkedExplanationStep[];
  readonly conclusionZh: string;
  readonly trapZh: string;
  readonly nextDrillZh: string;
}

export interface TmuaSpecimenP1WorkedExplanations {
  readonly schemaVersion: 1;
  readonly id: typeof TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID;
  readonly paperId: "tmua-specimen-p1";
  readonly edition: string;
  readonly publicationStatus: "published";
  readonly titleZh: string;
  readonly titleEn: string;
  readonly subtitleZh: string;
  readonly subtitleEn: string;
  readonly authorship: string;
  readonly rightsNotice: string;
  readonly sourceEvidence: {
    readonly questionSha256: string;
    readonly answerSha256: string;
    readonly workedSolutionSha256: string;
    readonly questionPages: readonly number[];
    readonly auditedAt: string;
    readonly fidelityStatus: "visually-verified";
  };
  readonly explanations: readonly WorkedExplanation[];
}

export type EntitledContentPayload =
  | TmuaSixWeekPlan
  | TmuaSpecimenP1WorkedExplanations;

export interface EntitledContentResource {
  readonly id: string;
  readonly title: string;
  readonly revision: number;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly sourceSha256: string;
  readonly payload: EntitledContentPayload;
}

export type EntitledContentResult =
  | { readonly status: "unauthenticated" }
  | { readonly status: "locked" }
  | { readonly status: "available"; readonly resource: EntitledContentResource };

export interface EntitledContentService {
  readonly configured: boolean;
  load(resourceId: string): Promise<EntitledContentResult>;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value as number;
}

function stringList(value: unknown, label: string, minimum = 1): readonly string[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new Error(`${label} must contain at least ${minimum} items`);
  }
  return value.map((item, index) => text(item, `${label}.${index}`));
}

function objectList<T>(
  value: unknown,
  label: string,
  parser: (item: Record<string, unknown>, index: number) => T,
  minimum = 1,
): readonly T[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new Error(`${label} must contain at least ${minimum} items`);
  }
  return value.map((item, index) => parser(record(item, `${label}.${index}`), index));
}

export function parseTmuaSixWeekPlan(value: unknown): TmuaSixWeekPlan {
  const root = record(value, "TMUA six-week plan");
  if (
    root.schemaVersion !== 1 ||
    root.id !== TMUA_SIX_WEEK_PLAN_RESOURCE_ID ||
    root.publicationStatus !== "published"
  ) {
    throw new Error("TMUA six-week plan header is invalid");
  }

  const preflight = record(root.preflight, "preflight");
  const weeklyReview = record(root.weeklyReview, "weeklyReview");
  const benchmarkBoundary = record(root.benchmarkBoundary, "benchmarkBoundary");
  const weeklyPlan = objectList(root.weeklyPlan, "weeklyPlan", (week) => ({
    week: positiveInteger(week.week, "weeklyPlan.week"),
    titleZh: text(week.titleZh, "weeklyPlan.titleZh"),
    titleEn: text(week.titleEn, "weeklyPlan.titleEn"),
    purposeZh: text(week.purposeZh, "weeklyPlan.purposeZh"),
    targetHours: text(week.targetHours, "weeklyPlan.targetHours"),
    sessions: objectList(week.sessions, "weeklyPlan.sessions", (session) => ({
      day: text(session.day, "weeklyPlan.sessions.day"),
      minutes: positiveInteger(session.minutes, "weeklyPlan.sessions.minutes"),
      titleZh: text(session.titleZh, "weeklyPlan.sessions.titleZh"),
      actionsZh: stringList(session.actionsZh, "weeklyPlan.sessions.actionsZh", 2),
      evidenceZh: text(session.evidenceZh, "weeklyPlan.sessions.evidenceZh"),
    }), 5),
    exitCriteriaZh: stringList(week.exitCriteriaZh, "weeklyPlan.exitCriteriaZh", 2),
  }), 6);

  const weekNumbers = weeklyPlan.map((week) => week.week);
  if (new Set(weekNumbers).size !== weeklyPlan.length || weekNumbers.some((week, index) => week !== index + 1)) {
    throw new Error("TMUA weekly plan must contain consecutive weeks");
  }

  return {
    schemaVersion: 1,
    id: TMUA_SIX_WEEK_PLAN_RESOURCE_ID,
    edition: text(root.edition, "edition"),
    publicationStatus: "published",
    titleZh: text(root.titleZh, "titleZh"),
    titleEn: text(root.titleEn, "titleEn"),
    subtitleZh: text(root.subtitleZh, "subtitleZh"),
    subtitleEn: text(root.subtitleEn, "subtitleEn"),
    authorship: text(root.authorship, "authorship"),
    audienceZh: text(root.audienceZh, "audienceZh"),
    rightsNotice: text(root.rightsNotice, "rightsNotice"),
    principles: objectList(root.principles, "principles", (principle) => ({
      titleZh: text(principle.titleZh, "principles.titleZh"),
      titleEn: text(principle.titleEn, "principles.titleEn"),
      bodyZh: text(principle.bodyZh, "principles.bodyZh"),
    }), 4),
    preflight: {
      titleZh: text(preflight.titleZh, "preflight.titleZh"),
      titleEn: text(preflight.titleEn, "preflight.titleEn"),
      steps: objectList(preflight.steps, "preflight.steps", (step) => ({
        minutes: positiveInteger(step.minutes, "preflight.steps.minutes"),
        actionZh: text(step.actionZh, "preflight.steps.actionZh"),
        detailZh: text(step.detailZh, "preflight.steps.detailZh"),
        evidenceZh: text(step.evidenceZh, "preflight.steps.evidenceZh"),
      }), 3),
    },
    weeklyPlan,
    errorCodebook: objectList(root.errorCodebook, "errorCodebook", (errorCode) => ({
      code: text(errorCode.code, "errorCodebook.code"),
      nameZh: text(errorCode.nameZh, "errorCodebook.nameZh"),
      nameEn: text(errorCode.nameEn, "errorCodebook.nameEn"),
      signalZh: text(errorCode.signalZh, "errorCodebook.signalZh"),
      nextActionZh: text(errorCode.nextActionZh, "errorCodebook.nextActionZh"),
    }), 5),
    curriculumAdjustments: objectList(root.curriculumAdjustments, "curriculumAdjustments", (adjustment) => ({
      curriculum: text(adjustment.curriculum, "curriculumAdjustments.curriculum"),
      guidanceZh: text(adjustment.guidanceZh, "curriculumAdjustments.guidanceZh"),
    }), 4),
    weeklyReview: {
      titleZh: text(weeklyReview.titleZh, "weeklyReview.titleZh"),
      titleEn: text(weeklyReview.titleEn, "weeklyReview.titleEn"),
      questionsZh: stringList(weeklyReview.questionsZh, "weeklyReview.questionsZh", 6),
    },
    benchmarkBoundary: {
      titleZh: text(benchmarkBoundary.titleZh, "benchmarkBoundary.titleZh"),
      titleEn: text(benchmarkBoundary.titleEn, "benchmarkBoundary.titleEn"),
      bodyZh: text(benchmarkBoundary.bodyZh, "benchmarkBoundary.bodyZh"),
    },
  };
}

function sha256(value: unknown, label: string): string {
  const parsed = text(value, label);
  if (!/^[0-9a-f]{64}$/u.test(parsed)) {
    throw new Error(`${label} must be a SHA-256 digest`);
  }
  return parsed;
}

export function parseTmuaSpecimenP1WorkedExplanations(
  value: unknown,
): TmuaSpecimenP1WorkedExplanations {
  const root = record(value, "TMUA specimen Paper 1 worked explanations");
  if (
    root.schemaVersion !== 1 ||
    root.id !== TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID ||
    root.paperId !== "tmua-specimen-p1" ||
    root.publicationStatus !== "published"
  ) {
    throw new Error("TMUA specimen Paper 1 worked explanations header is invalid");
  }

  const sourceEvidence = record(root.sourceEvidence, "sourceEvidence");
  if (!Array.isArray(sourceEvidence.questionPages) || sourceEvidence.questionPages.length !== 20) {
    throw new Error("sourceEvidence.questionPages must contain exactly 20 pages");
  }
  const parsedQuestionPages = sourceEvidence.questionPages.map(
    (page, index) => positiveInteger(page, `sourceEvidence.questionPages.${index}`),
  );

  const expectedAnswers = [..."DDBEDDCFADEDCDAEDBDG"];
  const explanations = objectList(root.explanations, "explanations", (item, index) => {
    const number = positiveInteger(item.number, `explanations.${index}.number`);
    const correctAnswer = text(item.correctAnswer, `explanations.${index}.correctAnswer`);
    const expectedNumber = index + 1;
    if (
      number !== expectedNumber ||
      item.questionId !== `tmua-specimen-p1-q${String(expectedNumber).padStart(2, "0")}` ||
      correctAnswer !== expectedAnswers[index]
    ) {
      throw new Error(`explanations.${index} does not match the verified paper answer map`);
    }
    return {
      questionId: item.questionId,
      number,
      correctAnswer,
      topicZh: text(item.topicZh, `explanations.${index}.topicZh`),
      topicEn: text(item.topicEn, `explanations.${index}.topicEn`),
      methodZh: text(item.methodZh, `explanations.${index}.methodZh`),
      methodEn: text(item.methodEn, `explanations.${index}.methodEn`),
      keyIdeaZh: text(item.keyIdeaZh, `explanations.${index}.keyIdeaZh`),
      steps: objectList(item.steps, `explanations.${index}.steps`, (step, stepIndex) => ({
        titleZh: text(step.titleZh, `explanations.${index}.steps.${stepIndex}.titleZh`),
        bodyZh: text(step.bodyZh, `explanations.${index}.steps.${stepIndex}.bodyZh`),
        ...(step.math === undefined
          ? {}
          : { math: text(step.math, `explanations.${index}.steps.${stepIndex}.math`) }),
      }), 2),
      conclusionZh: text(item.conclusionZh, `explanations.${index}.conclusionZh`),
      trapZh: text(item.trapZh, `explanations.${index}.trapZh`),
      nextDrillZh: text(item.nextDrillZh, `explanations.${index}.nextDrillZh`),
    };
  }, 20);
  if (explanations.length !== 20) {
    throw new Error("TMUA specimen Paper 1 must contain exactly 20 explanations");
  }

  if (
    sourceEvidence.questionSha256 !== "d2e826c828b6102024bddd49b5edb85cedde4b50f116a4e2e3a0b41cf6f04241" ||
    sourceEvidence.answerSha256 !== "e8b15c8e90f9b9db850d28a1b58a13a0c82fdf03becc58aff15e64c206fc3cca" ||
    sourceEvidence.workedSolutionSha256 !== "d628203f6777a26dc0459410a598a9d6824f86dd0e62ef9a3ddd8350d0415585" ||
    sourceEvidence.fidelityStatus !== "visually-verified"
  ) {
    throw new Error("TMUA specimen Paper 1 source evidence does not match the audited files");
  }

  return {
    schemaVersion: 1,
    id: TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID,
    paperId: "tmua-specimen-p1",
    edition: text(root.edition, "edition"),
    publicationStatus: "published",
    titleZh: text(root.titleZh, "titleZh"),
    titleEn: text(root.titleEn, "titleEn"),
    subtitleZh: text(root.subtitleZh, "subtitleZh"),
    subtitleEn: text(root.subtitleEn, "subtitleEn"),
    authorship: text(root.authorship, "authorship"),
    rightsNotice: text(root.rightsNotice, "rightsNotice"),
    sourceEvidence: {
      questionSha256: sha256(sourceEvidence.questionSha256, "sourceEvidence.questionSha256"),
      answerSha256: sha256(sourceEvidence.answerSha256, "sourceEvidence.answerSha256"),
      workedSolutionSha256: sha256(sourceEvidence.workedSolutionSha256, "sourceEvidence.workedSolutionSha256"),
      questionPages: parsedQuestionPages,
      auditedAt: text(sourceEvidence.auditedAt, "sourceEvidence.auditedAt"),
      fidelityStatus: "visually-verified",
    },
    explanations,
  };
}

export function parseEntitledContentPayload(
  resourceId: string,
  value: unknown,
): EntitledContentPayload {
  if (resourceId === TMUA_SIX_WEEK_PLAN_RESOURCE_ID) {
    return parseTmuaSixWeekPlan(value);
  }
  if (resourceId === TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID) {
    return parseTmuaSpecimenP1WorkedExplanations(value);
  }
  throw new Error("当前版本尚不能显示这份资料");
}
