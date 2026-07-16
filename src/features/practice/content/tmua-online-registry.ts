import rawManifest from "../../../../content/tmua/online-papers.json" with { type: "json" };
import { TMUA_2023_P1 } from "./tmua-2023-p1.js";
import type { PracticePaper, PracticeQuestion, QuestionBlock } from "./types.js";
import { validatePracticePaper } from "./validate.js";

export interface TmuaOnlinePaperRecord {
  readonly id: string;
  readonly edition: string;
  readonly label: string;
  readonly paper: 1 | 2;
  readonly durationMinutes: 75;
  readonly questionCount: 20;
  readonly deliveryMode: "source-pdf-answer-sheet";
  readonly publicDocumentPath: string;
  readonly sourceQuestionPath: string;
  readonly sourceAnswerPath: string;
  readonly questionSourceSha256: string;
  readonly answerSourceSha256: string;
  readonly questionPages: readonly number[];
  readonly answers: readonly string[];
  readonly answerLabels: "ABCDEFGH";
  readonly reviewStatus: "source-and-answer-verified";
}

interface TmuaOnlinePaperManifest {
  readonly schemaVersion: 1;
  readonly exam: "TMUA";
  readonly generatedAt: string;
  readonly paperCount: 18;
  readonly questionCount: 360;
  readonly papers: readonly TmuaOnlinePaperRecord[];
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function parseManifest(value: unknown): TmuaOnlinePaperManifest {
  assertRecord(value, "TMUA online paper manifest");
  if (
    value.schemaVersion !== 1 ||
    value.exam !== "TMUA" ||
    value.paperCount !== 18 ||
    value.questionCount !== 360 ||
    typeof value.generatedAt !== "string" ||
    !Array.isArray(value.papers) ||
    value.papers.length !== 18
  ) {
    throw new Error("TMUA online paper manifest header is invalid");
  }

  const papers = value.papers.map((candidate, index) => {
    assertRecord(candidate, `papers.${index}`);
    if (
      typeof candidate.id !== "string" ||
      !/^tmua-.+-p[12]$/u.test(candidate.id) ||
      typeof candidate.edition !== "string" ||
      typeof candidate.label !== "string" ||
      (candidate.paper !== 1 && candidate.paper !== 2) ||
      candidate.durationMinutes !== 75 ||
      candidate.questionCount !== 20 ||
      candidate.deliveryMode !== "source-pdf-answer-sheet" ||
      typeof candidate.publicDocumentPath !== "string" ||
      !candidate.publicDocumentPath.startsWith("/papers/tmua/") ||
      typeof candidate.sourceQuestionPath !== "string" ||
      typeof candidate.sourceAnswerPath !== "string" ||
      typeof candidate.questionSourceSha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(candidate.questionSourceSha256) ||
      typeof candidate.answerSourceSha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(candidate.answerSourceSha256) ||
      !Array.isArray(candidate.questionPages) ||
      candidate.questionPages.length !== 20 ||
      !candidate.questionPages.every((page) => Number.isInteger(page) && (page as number) > 0) ||
      !Array.isArray(candidate.answers) ||
      candidate.answers.length !== 20 ||
      !candidate.answers.every((answer) => typeof answer === "string" && /^[A-H]$/u.test(answer)) ||
      candidate.answerLabels !== "ABCDEFGH" ||
      candidate.reviewStatus !== "source-and-answer-verified"
    ) {
      throw new Error(`TMUA online paper manifest entry ${index} is invalid`);
    }
    return candidate as unknown as TmuaOnlinePaperRecord;
  });
  if (new Set(papers.map((paper) => paper.id)).size !== papers.length) {
    throw new Error("TMUA online paper IDs must be unique");
  }
  return {
    schemaVersion: 1,
    exam: "TMUA",
    generatedAt: value.generatedAt,
    paperCount: 18,
    questionCount: 360,
    papers,
  };
}

function answerOption(label: string) {
  return {
    label,
    content: [
      {
        kind: "paragraph" as const,
        runs: [{ kind: "text" as const, value: `选择 ${label}` }],
      },
    ],
  };
}

function sourcePdfQuestion(
  paper: TmuaOnlinePaperRecord,
  questionNumber: number,
): PracticeQuestion {
  const sourceBlock: QuestionBlock = {
    kind: "source-pdf",
    src: paper.publicDocumentPath,
    page: paper.questionPages[questionNumber - 1]!,
    title: `${paper.label} Paper ${paper.paper} 第 ${questionNumber} 题原卷`,
  };
  return {
    id: `${paper.id}-q${String(questionNumber).padStart(2, "0")}`,
    number: questionNumber,
    sourcePage: paper.questionPages[questionNumber - 1]!,
    prompt: [sourceBlock],
    options: [...paper.answerLabels].map(answerOption),
    correctAnswer: paper.answers[questionNumber - 1]!,
    knowledgeTags: [],
    skillTags: [],
    reviewStatus: "verified",
    sourceQuestionPath: paper.sourceQuestionPath,
    sourceAnswerPath: paper.sourceAnswerPath,
  };
}

function sourcePdfPaper(record: TmuaOnlinePaperRecord): PracticePaper {
  return {
    id: record.id,
    exam: "TMUA",
    edition: record.edition,
    paper: record.paper,
    durationMinutes: 75,
    deliveryMode: "source-pdf-answer-sheet",
    questions: Array.from({ length: 20 }, (_, index) =>
      sourcePdfQuestion(record, index + 1),
    ),
  };
}

export const TMUA_ONLINE_PAPER_MANIFEST = parseManifest(rawManifest);
export const TMUA_ONLINE_PAPERS = TMUA_ONLINE_PAPER_MANIFEST.papers;

const practicePapers = new Map<string, PracticePaper>(
  TMUA_ONLINE_PAPERS.map((record) => [
    record.id,
    record.id === TMUA_2023_P1.id ? TMUA_2023_P1 : sourcePdfPaper(record),
  ]),
);

for (const paper of practicePapers.values()) {
  const issues = validatePracticePaper(paper);
  if (issues.length > 0) {
    throw new Error(`Invalid online paper ${paper.id}: ${issues.map((issue) => issue.code).join(", ")}`);
  }
}

export function getTmuaPracticePaper(paperId: string): PracticePaper | null {
  return practicePapers.get(paperId) ?? null;
}
