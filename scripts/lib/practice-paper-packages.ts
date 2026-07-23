import type {
  PracticePaper,
  PracticeQuestion,
  PracticeStatement,
} from "../../src/features/practice/content/types.js";
import type { PracticePaperContentRef } from "../../src/features/practice/content/published-revisions.js";

export interface PublicPracticeStatement extends Omit<PracticeStatement, "correctAnswer"> {}

export interface PublicPracticeQuestion extends Omit<
  PracticeQuestion,
  "correctAnswer" | "sourceQuestionPath" | "sourceAnswerPath" | "reviewStatus" | "statements" | "scoring"
> {
  readonly statements?: readonly PublicPracticeStatement[];
  readonly scoring?: {
    readonly kind: NonNullable<PracticeQuestion["scoring"]>["kind"];
  };
}

export interface PublicPracticePaper extends Omit<PracticePaper, "questions"> {
  readonly contentRef: PracticePaperContentRef;
  readonly questions: readonly PublicPracticeQuestion[];
}

export interface PrivateQuestionAnswerKey {
  readonly questionId: string;
  readonly correctAnswer: string;
  readonly responseMode: NonNullable<PracticeQuestion["responseMode"]> | "single-choice";
  readonly scoring?: PracticeQuestion["scoring"];
  readonly statements?: readonly Pick<PracticeStatement, "id" | "correctAnswer">[];
}

export interface PrivatePaperAnswerKey {
  readonly schemaVersion: 1;
  readonly paperId: string;
  readonly paperRevisionId: string;
  readonly contentDigest: string;
  readonly responseMode: PracticePaper["responseMode"] | "choice";
  readonly questions: readonly PrivateQuestionAnswerKey[];
}

export interface RevisionPackageRecord {
  readonly paperRevisionId: string;
}

export function mergeImmutableRevisionPackages<T extends RevisionPackageRecord>(
  revisionIds: readonly string[],
  existingPackages: readonly T[],
  currentPackages: readonly T[],
): readonly T[] {
  const existingByRevision = new Map<string, T>();
  for (const item of existingPackages) {
    if (existingByRevision.has(item.paperRevisionId)) {
      throw new Error(`Duplicate historical practice package: ${item.paperRevisionId}`);
    }
    existingByRevision.set(item.paperRevisionId, item);
  }

  const currentByRevision = new Map<string, T>();
  for (const item of currentPackages) {
    if (currentByRevision.has(item.paperRevisionId)) {
      throw new Error(`Duplicate current practice package: ${item.paperRevisionId}`);
    }
    currentByRevision.set(item.paperRevisionId, item);
  }

  return revisionIds.map((paperRevisionId) => {
    const item = currentByRevision.get(paperRevisionId) ?? existingByRevision.get(paperRevisionId);
    if (item === undefined) {
      throw new Error(
        `Historical practice package is missing and cannot be reconstructed safely: ${paperRevisionId}`,
      );
    }
    return item;
  });
}

function publicQuestion(question: PracticeQuestion): PublicPracticeQuestion {
  return {
    id: question.id,
    number: question.number,
    sourcePage: question.sourcePage,
    ...(question.passageId === undefined ? {} : { passageId: question.passageId }),
    ...(question.responseMode === undefined ? {} : { responseMode: question.responseMode }),
    prompt: question.prompt,
    options: question.options,
    ...(question.statements === undefined
      ? {}
      : {
          statements: question.statements.map((statement) => ({
            id: statement.id,
            content: statement.content,
          })),
        }),
    ...(question.scoring === undefined ? {} : { scoring: { kind: question.scoring.kind } }),
    knowledgeTags: question.knowledgeTags,
    skillTags: question.skillTags,
    ...(question.explanationResourceId === undefined
      ? {}
      : { explanationResourceId: question.explanationResourceId }),
  };
}

export function buildPublicPracticePaper(
  paper: PracticePaper,
  contentRef: PracticePaperContentRef,
): PublicPracticePaper {
  return {
    id: paper.id,
    exam: paper.exam,
    edition: paper.edition,
    ...(paper.paper === undefined ? {} : { paper: paper.paper }),
    ...(paper.sectionId === undefined ? {} : { sectionId: paper.sectionId }),
    ...(paper.sectionLabel === undefined ? {} : { sectionLabel: paper.sectionLabel }),
    ...(paper.sectionLabelZh === undefined ? {} : { sectionLabelZh: paper.sectionLabelZh }),
    durationMinutes: paper.durationMinutes,
    deliveryMode: paper.deliveryMode,
    ...(paper.calculator === undefined ? {} : { calculator: paper.calculator }),
    ...(paper.responseMode === undefined ? {} : { responseMode: paper.responseMode }),
    ...(paper.essayTask === undefined ? {} : { essayTask: paper.essayTask }),
    ...(paper.passages === undefined ? {} : { passages: paper.passages }),
    questions: paper.questions.map(publicQuestion),
    ...(paper.access === undefined ? {} : { access: paper.access }),
    contentRef,
  };
}

export function buildPrivatePaperAnswerKey(
  paper: PracticePaper,
  contentRef: PracticePaperContentRef,
): PrivatePaperAnswerKey {
  return {
    schemaVersion: 1,
    paperId: paper.id,
    paperRevisionId: contentRef.paperRevisionId,
    contentDigest: contentRef.contentDigest,
    responseMode: paper.responseMode ?? "choice",
    questions: paper.questions.map((question) => ({
      questionId: question.id,
      correctAnswer: question.correctAnswer,
      responseMode: question.responseMode ?? "single-choice",
      ...(question.scoring === undefined ? {} : { scoring: question.scoring }),
      ...(question.statements === undefined
        ? {}
        : {
            statements: question.statements.map((statement) => ({
              id: statement.id,
              correctAnswer: statement.correctAnswer,
            })),
          }),
    })),
  };
}
