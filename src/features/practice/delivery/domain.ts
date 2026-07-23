import type {
  PracticePaper,
  PracticeQuestion,
  PracticeStatement,
} from "../content/types.js";
import {
  publishedContentRefForRevisionId,
  type PracticePaperContentRef,
} from "../content/published-revisions.js";
import type { PracticeResults } from "../domain/results.js";
import type { PracticeSession } from "../domain/session.js";

export type DeliveredPracticeStatement = Omit<PracticeStatement, "correctAnswer">;

export interface DeliveredPracticeQuestion extends Omit<
  PracticeQuestion,
  "correctAnswer" | "sourceQuestionPath" | "sourceAnswerPath" | "reviewStatus" | "statements" | "scoring"
> {
  readonly statements?: readonly DeliveredPracticeStatement[];
  readonly scoring?: {
    readonly kind: NonNullable<PracticeQuestion["scoring"]>["kind"];
  };
}

export interface DeliveredPracticePaper extends Omit<PracticePaper, "questions"> {
  readonly contentRef: PracticePaperContentRef;
  readonly questions: readonly DeliveredPracticeQuestion[];
}

export interface PracticeDeliveryService {
  readonly configured: boolean;
  loadPaper(paperId: string, paperRevisionId?: string): Promise<DeliveredPracticePaper | null>;
  score(session: PracticeSession): Promise<PracticeResults>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const forbiddenDeliveryKeys = [
  "correctAnswer",
  "sourceQuestionPath",
  "sourceAnswerPath",
  "reviewStatus",
] as const;

export function parseDeliveredPracticePaper(
  value: unknown,
  expectedPaperId: string,
): DeliveredPracticePaper {
  if (!isRecord(value) || value.id !== expectedPaperId || !Array.isArray(value.questions)) {
    throw new Error("题库服务返回了无法识别的试卷");
  }
  const serialized = JSON.stringify(value);
  if (forbiddenDeliveryKeys.some((key) => serialized.includes(`\"${key}\"`))) {
    throw new Error("题库服务越过了公开题面边界");
  }
  if (!isRecord(value.contentRef)) {
    throw new Error("题库服务没有返回内容版本");
  }
  const returnedRevisionId = typeof value.contentRef.paperRevisionId === "string"
    ? value.contentRef.paperRevisionId
    : "";
  const expectedRef = publishedContentRefForRevisionId(returnedRevisionId);
  if (
    expectedRef === null ||
    value.contentRef.paperId !== expectedRef.paperId ||
    value.contentRef.paperRevisionId !== expectedRef.paperRevisionId ||
    value.contentRef.contentDigest !== expectedRef.contentDigest ||
    value.contentRef.revision !== expectedRef.revision ||
    value.contentRef.schemaVersion !== expectedRef.schemaVersion
  ) {
    throw new Error("题库内容版本与发布清单不一致");
  }
  if (
    value.questions.length === 0 ||
    value.questions.some((question) => !isRecord(question) || typeof question.id !== "string")
  ) {
    throw new Error("题库服务返回的题目不完整");
  }
  return value as unknown as DeliveredPracticePaper;
}

export function parsePracticeResults(
  value: unknown,
  session: PracticeSession,
): PracticeResults {
  if (
    !isRecord(value) ||
    value.sessionId !== session.id ||
    value.paperId !== session.paperId ||
    value.paperRevisionId !== session.paperRevisionId ||
    value.contentDigest !== session.contentDigest ||
    typeof value.score !== "number" ||
    typeof value.maxScore !== "number" ||
    typeof value.percentage !== "number" ||
    !Array.isArray(value.questions) ||
    !Array.isArray(value.topics) ||
    !Array.isArray(value.longestQuestionIds)
  ) {
    throw new Error("评分服务返回了无法识别的结果");
  }
  return value as unknown as PracticeResults;
}
