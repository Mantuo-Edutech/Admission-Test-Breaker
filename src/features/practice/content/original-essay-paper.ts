import type { OriginalPracticeMetadata } from "./esat-original-starter.js";
import type { PracticePaper } from "./types.js";
import { validatePracticePaper } from "./validate.js";

interface OriginalEssayExpectation {
  readonly id: string;
  readonly exam: "TARA" | "LNAT";
  readonly sectionId: string;
  readonly sourcePath: string;
}

export type OriginalEssayPaper = PracticePaper & OriginalPracticeMetadata;

export function loadOriginalEssayPaper(
  rawPaper: unknown,
  expected: OriginalEssayExpectation,
): OriginalEssayPaper {
  const paper = rawPaper as OriginalEssayPaper;
  const issues = validatePracticePaper(paper);
  const metadataIsValid =
    paper.schemaVersion === 1 &&
    paper.id === expected.id &&
    paper.exam === expected.exam &&
    paper.sectionId === expected.sectionId &&
    paper.responseMode === "essay" &&
    paper.publicationStatus === "teaching-preview" &&
    paper.authorship === "满托教研原创" &&
    paper.deliveryMode === "structured" &&
    paper.questions.length === 1 &&
    paper.sourceAnchors.length === 2 &&
    paper.sourceAnchors.every((source) =>
      source.localPath.startsWith("content/official/raw/") && /^[a-f0-9]{64}$/u.test(source.sha256)
    ) &&
    paper.questions.every((question) =>
      question.sourceQuestionPath === expected.sourcePath && question.sourceAnswerPath === expected.sourcePath
    );

  if (issues.length > 0 || !metadataIsValid) {
    throw new Error(`Invalid original essay paper ${expected.id}: ${issues.map((issue) => issue.code).join(", ")}`);
  }
  return paper;
}
