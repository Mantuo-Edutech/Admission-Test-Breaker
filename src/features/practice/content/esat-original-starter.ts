import type { PracticePaper } from "./types.js";
import { validatePracticePaper } from "./validate.js";

export interface OriginalPracticeMetadata {
  readonly schemaVersion: 1;
  readonly publicationStatus: "teaching-preview";
  readonly authorship: string;
  readonly rightsNotice: string;
  readonly sourceAnchors: readonly {
    readonly id: string;
    readonly localPath: string;
    readonly sha256: string;
    readonly usedFor: string;
  }[];
}

interface EsatOriginalStarterExpectation {
  readonly id: string;
  readonly requiredKnowledgeTags: readonly string[];
}

interface OriginalChoiceStarterExpectation extends EsatOriginalStarterExpectation {
  readonly exam: PracticePaper["exam"];
  readonly sourcePath: string;
  readonly questionCount: number;
  readonly durationMinutes: number;
}

export type OriginalChoiceStarter = PracticePaper & OriginalPracticeMetadata;
export type EsatOriginalStarter = OriginalChoiceStarter;
export type EsatOriginalMock = OriginalChoiceStarter;

export function loadOriginalChoiceStarter(
  rawPaper: unknown,
  expected: OriginalChoiceStarterExpectation,
): OriginalChoiceStarter {
  const paper = rawPaper as OriginalChoiceStarter;
  const issues = validatePracticePaper(paper, { questionCount: expected.questionCount });
  const knowledgeTags = new Set(paper.questions.flatMap((question) => question.knowledgeTags));
  const metadataIsValid =
    paper.schemaVersion === 1 &&
    paper.id === expected.id &&
    paper.exam === expected.exam &&
    paper.publicationStatus === "teaching-preview" &&
    paper.authorship === "满托教研原创" &&
    paper.deliveryMode === "structured" &&
    paper.questions.length === expected.questionCount &&
    paper.durationMinutes === expected.durationMinutes &&
    paper.sourceAnchors.length === 2 &&
    paper.sourceAnchors.every((source) =>
      source.localPath.startsWith("content/official/raw/") && /^[a-f0-9]{64}$/u.test(source.sha256)
    ) &&
    expected.requiredKnowledgeTags.every((tag) => knowledgeTags.has(tag)) &&
    paper.questions.every((question) =>
      question.sourceQuestionPath === expected.sourcePath && question.sourceAnswerPath === expected.sourcePath
    );

  if (issues.length > 0 || !metadataIsValid) {
    throw new Error(`Invalid original choice starter ${expected.id}: ${issues.map((issue) => issue.code).join(", ")}`);
  }

  return paper;
}

export function loadEsatOriginalStarter(
  rawPaper: unknown,
  expected: EsatOriginalStarterExpectation,
): EsatOriginalStarter {
  return loadOriginalChoiceStarter(rawPaper, {
    ...expected,
    exam: "ESAT",
    sourcePath: `content/esat/original-practice/${expected.id.replace(/^esat-/u, "")}.json`,
    questionCount: 10,
    durationMinutes: 20,
  });
}

export function loadEsatOriginalMock(
  rawPaper: unknown,
  expected: EsatOriginalStarterExpectation,
): EsatOriginalMock {
  return loadOriginalChoiceStarter(rawPaper, {
    ...expected,
    exam: "ESAT",
    sourcePath: `content/esat/original-practice/${expected.id.replace(/^esat-/u, "")}.json`,
    questionCount: 27,
    durationMinutes: 40,
  });
}
