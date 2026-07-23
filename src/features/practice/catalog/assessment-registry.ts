import rawRegistry from "../../../../content/exams/assessment-structures.json" with { type: "json" };

export type PracticeExamId = "tmua" | "esat" | "tara" | "lnat" | "ucat";
export type PracticeResponseMode =
  | "single-choice"
  | "passage-choice"
  | "essay"
  | "mixed-choice"
  | "data-choice"
  | "partial-credit-choice";

export interface AssessmentSection {
  readonly id: string;
  readonly label: string;
  readonly labelZh: string;
  readonly questionCount: number;
  readonly promptCount?: number;
  readonly durationMinutes: number;
  readonly responseMode: PracticeResponseMode;
  readonly calculator: "none" | "basic";
}

export interface AssessmentDefinition {
  readonly id: PracticeExamId;
  readonly name: Uppercase<PracticeExamId>;
  readonly sourceUrl: string;
  readonly sections: readonly AssessmentSection[];
}

export interface PracticeAccessPolicy {
  readonly attempt: "public";
  readonly basicResult: "public";
  readonly answerKey: "public";
  readonly workedExplanation: "entitled";
  readonly personalisedInterpretation: "entitled";
}

const examIds: readonly PracticeExamId[] = ["tmua", "esat", "tara", "lnat", "ucat"];
const responseModes: readonly PracticeResponseMode[] = [
  "single-choice",
  "passage-choice",
  "essay",
  "mixed-choice",
  "data-choice",
  "partial-credit-choice",
];

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function parseSection(value: unknown, label: string): AssessmentSection {
  assertRecord(value, label);
  if (
    typeof value.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.id) ||
    typeof value.label !== "string" || value.label.trim() === "" ||
    typeof value.labelZh !== "string" || value.labelZh.trim() === "" ||
    !Number.isInteger(value.questionCount) || (value.questionCount as number) < 1 || (value.questionCount as number) > 99 ||
    !Number.isInteger(value.durationMinutes) || (value.durationMinutes as number) < 1 || (value.durationMinutes as number) > 180 ||
    typeof value.responseMode !== "string" || !responseModes.includes(value.responseMode as PracticeResponseMode) ||
    (value.calculator !== "none" && value.calculator !== "basic") ||
    (value.promptCount !== undefined && (!Number.isInteger(value.promptCount) || (value.promptCount as number) < 1))
  ) {
    throw new Error(`${label} is invalid`);
  }
  return {
    id: value.id,
    label: value.label,
    labelZh: value.labelZh,
    questionCount: value.questionCount as number,
    ...(value.promptCount === undefined ? {} : { promptCount: value.promptCount as number }),
    durationMinutes: value.durationMinutes as number,
    responseMode: value.responseMode as PracticeResponseMode,
    calculator: value.calculator,
  };
}

function parseRegistry(value: unknown): {
  readonly exams: readonly AssessmentDefinition[];
  readonly accessPolicy: PracticeAccessPolicy;
} {
  assertRecord(value, "Assessment registry");
  if (value.schemaVersion !== 1 || !Array.isArray(value.exams)) {
    throw new Error("Assessment registry header is invalid");
  }
  const exams = value.exams.map((candidate, index): AssessmentDefinition => {
    assertRecord(candidate, `exams.${index}`);
    if (
      typeof candidate.id !== "string" || !examIds.includes(candidate.id as PracticeExamId) ||
      candidate.name !== candidate.id.toUpperCase() ||
      typeof candidate.sourceUrl !== "string" || !candidate.sourceUrl.startsWith("https://") ||
      !Array.isArray(candidate.sections) || candidate.sections.length === 0
    ) {
      throw new Error(`exams.${index} is invalid`);
    }
    const sections = candidate.sections.map((section, sectionIndex) => parseSection(section, `exams.${index}.sections.${sectionIndex}`));
    if (new Set(sections.map((section) => section.id)).size !== sections.length) {
      throw new Error(`exams.${index} has duplicate section IDs`);
    }
    return {
      id: candidate.id as PracticeExamId,
      name: candidate.name as Uppercase<PracticeExamId>,
      sourceUrl: candidate.sourceUrl,
      sections,
    };
  });
  if (new Set(exams.map((exam) => exam.id)).size !== examIds.length || !examIds.every((id) => exams.some((exam) => exam.id === id))) {
    throw new Error("Assessment registry must define every supported exam exactly once");
  }
  assertRecord(value.accessPolicy, "accessPolicy");
  const accessPolicy = value.accessPolicy;
  if (
    accessPolicy.attempt !== "public" || accessPolicy.basicResult !== "public" ||
    accessPolicy.answerKey !== "public" || accessPolicy.workedExplanation !== "entitled" ||
    accessPolicy.personalisedInterpretation !== "entitled"
  ) {
    throw new Error("Assessment access policy is invalid");
  }
  return { exams, accessPolicy: accessPolicy as unknown as PracticeAccessPolicy };
}

const parsed = parseRegistry(rawRegistry);

export const ASSESSMENT_REGISTRY = parsed.exams;
export const PRACTICE_ACCESS_POLICY = parsed.accessPolicy;

export function getAssessmentDefinition(examId: PracticeExamId): AssessmentDefinition {
  return ASSESSMENT_REGISTRY.find((exam) => exam.id === examId)!;
}

export function getAssessmentSection(examId: PracticeExamId, sectionId: string): AssessmentSection | null {
  return getAssessmentDefinition(examId).sections.find((section) => section.id === sectionId) ?? null;
}

export function deepReviewPackageId(examId: PracticeExamId): string {
  return `${examId}-deep-review`;
}
