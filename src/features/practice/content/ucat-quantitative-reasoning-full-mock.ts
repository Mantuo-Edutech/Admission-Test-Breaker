import rawFullMock from "../../../../content/ucat/original-practice/quantitative-reasoning-full-mock-v1.json" with { type: "json" };
import type { OriginalChoiceStarter, OriginalPracticeMetadata } from "./esat-original-starter.js";
import type {
  PracticePaper,
  PracticePassage,
  PracticeQuestion,
  QuestionBlock,
} from "./types.js";
import { validatePracticePaper } from "./validate.js";

const SOURCE_PATH = "content/ucat/original-practice/quantitative-reasoning-full-mock-v1.json";
const REQUIRED_KNOWLEDGE_TAGS = [
  "ucat-qr-percentage-decrease",
  "ucat-qr-time-conversion",
  "ucat-qr-percentage-increase",
  "ucat-qr-inventory-balance",
  "ucat-qr-percentage-of-total",
  "ucat-qr-multi-step-cost",
  "ucat-qr-speed",
  "ucat-qr-rate-per-time",
  "ucat-qr-weighted-percentage",
  "ucat-qr-percentage-points",
] as const;

interface CompactTable {
  readonly caption: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

interface CompactPassage {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly table: CompactTable;
}

interface CompactQuestion {
  readonly number: number;
  readonly passageId: string;
  readonly prompt: string;
  readonly options: readonly [string, string, string, string];
  readonly correctAnswer: "A" | "B" | "C" | "D";
  readonly knowledgeTags: readonly string[];
  readonly skillTags: readonly string[];
}

interface CompactFullMock extends OriginalPracticeMetadata {
  readonly id: string;
  readonly exam: "UCAT";
  readonly edition: string;
  readonly sectionId: "quantitative-reasoning";
  readonly sectionLabel: string;
  readonly sectionLabelZh: string;
  readonly durationMinutes: number;
  readonly deliveryMode: "structured";
  readonly responseMode: "choice";
  readonly calculator: "basic";
  readonly passages: readonly CompactPassage[];
  readonly questions: readonly CompactQuestion[];
}

function paragraph(value: string): QuestionBlock {
  return { kind: "paragraph", runs: [{ kind: "text", value }] };
}

function expandPassage(passage: CompactPassage): PracticePassage {
  return {
    id: passage.id,
    title: passage.title,
    content: [
      ...passage.paragraphs.map(paragraph),
      {
        kind: "table",
        caption: passage.table.caption,
        headers: [...passage.table.headers],
        rows: passage.table.rows.map((row) => [...row]),
      },
    ],
  };
}

function expandQuestion(question: CompactQuestion): PracticeQuestion {
  return {
    id: `ucat-quantitative-reasoning-full-mock-v1-q${String(question.number).padStart(2, "0")}`,
    number: question.number,
    sourcePage: question.number,
    passageId: question.passageId,
    prompt: [paragraph(question.prompt)],
    options: question.options.map((value, index) => ({
      label: String.fromCharCode(65 + index),
      content: [paragraph(value)],
    })),
    correctAnswer: question.correctAnswer,
    knowledgeTags: [...question.knowledgeTags],
    skillTags: [...question.skillTags],
    reviewStatus: "verified",
    sourceQuestionPath: SOURCE_PATH,
    sourceAnswerPath: SOURCE_PATH,
  };
}

function loadUcatQuantitativeReasoningFullMock(raw: unknown): OriginalChoiceStarter {
  const source = raw as CompactFullMock;
  const paper: PracticePaper & OriginalPracticeMetadata = {
    schemaVersion: source.schemaVersion,
    id: source.id,
    exam: source.exam,
    edition: source.edition,
    sectionId: source.sectionId,
    sectionLabel: source.sectionLabel,
    sectionLabelZh: source.sectionLabelZh,
    durationMinutes: source.durationMinutes,
    deliveryMode: source.deliveryMode,
    responseMode: source.responseMode,
    calculator: source.calculator,
    passages: source.passages.map(expandPassage),
    questions: source.questions.map(expandQuestion),
    publicationStatus: source.publicationStatus,
    authorship: source.authorship,
    rightsNotice: source.rightsNotice,
    sourceAnchors: source.sourceAnchors,
  };

  const issues = validatePracticePaper(paper, { questionCount: 36 });
  const knowledgeTags = new Set(paper.questions.flatMap((question) => question.knowledgeTags));
  const questionCountByPassage = new Map<string, number>();
  for (const question of paper.questions) {
    if (question.passageId !== undefined) {
      questionCountByPassage.set(question.passageId, (questionCountByPassage.get(question.passageId) ?? 0) + 1);
    }
  }
  const tables = (paper.passages ?? []).flatMap((passage) =>
    passage.content.filter((block) => block.kind === "table")
  );
  const metadataIsValid =
    paper.schemaVersion === 1 &&
    paper.id === "ucat-quantitative-reasoning-full-mock-v1" &&
    paper.exam === "UCAT" &&
    paper.sectionId === "quantitative-reasoning" &&
    paper.durationMinutes === 26 &&
    paper.calculator === "basic" &&
    paper.deliveryMode === "structured" &&
    paper.publicationStatus === "teaching-preview" &&
    paper.authorship === "满托教研原创" &&
    paper.questions.length === 36 &&
    paper.questions.every((question) => question.options.length === 4) &&
    paper.passages?.length === 9 &&
    tables.length === 9 &&
    tables.every((table) => table.rows.length > 0 && table.rows.every((row) => row.length === table.headers.length)) &&
    [...questionCountByPassage.values()].every((count) => count === 4) &&
    questionCountByPassage.size === 9 &&
    paper.sourceAnchors.length === 2 &&
    paper.sourceAnchors.every((sourceAnchor) =>
      sourceAnchor.localPath.startsWith("content/official/raw/") &&
      /^[a-f0-9]{64}$/u.test(sourceAnchor.sha256)
    ) &&
    REQUIRED_KNOWLEDGE_TAGS.every((tag) => knowledgeTags.has(tag)) &&
    paper.questions.every((question) =>
      question.sourceQuestionPath === SOURCE_PATH && question.sourceAnswerPath === SOURCE_PATH
    );

  if (issues.length > 0 || !metadataIsValid) {
    throw new Error(
      `Invalid UCAT Quantitative Reasoning full mock: ${issues.map((issue) => issue.code).join(", ")}`,
    );
  }

  return paper;
}

export const UCAT_QUANTITATIVE_REASONING_FULL_MOCK = loadUcatQuantitativeReasoningFullMock(rawFullMock);
