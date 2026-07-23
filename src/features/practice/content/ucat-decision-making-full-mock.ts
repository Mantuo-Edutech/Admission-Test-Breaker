import rawFullMock from "../../../../content/ucat/original-practice/decision-making-full-mock-v1.json" with { type: "json" };
import type { OriginalChoiceStarter, OriginalPracticeMetadata } from "./esat-original-starter.js";
import type {
  PracticePaper,
  PracticePassage,
  PracticeQuestion,
  PracticeStatement,
  QuestionBlock,
} from "./types.js";
import { validatePracticePaper } from "./validate.js";

const SOURCE_PATH = "content/ucat/original-practice/decision-making-full-mock-v1.json";
const REQUIRED_KNOWLEDGE_TAGS = [
  "ucat-dm-ordering",
  "ucat-dm-deduction",
  "ucat-dm-bayes-table",
  "ucat-dm-syllogisms",
  "ucat-dm-venn-counting",
  "ucat-dm-strongest-argument",
  "ucat-dm-data-inference",
  "ucat-dm-probability",
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
  readonly table?: CompactTable;
}

interface CompactStatement {
  readonly id: string;
  readonly text: string;
  readonly correctAnswer: "yes" | "no";
}

interface CompactQuestion {
  readonly number: number;
  readonly passageId?: string;
  readonly prompt: string;
  readonly options?: readonly string[];
  readonly correctAnswer?: string;
  readonly statements?: readonly CompactStatement[];
  readonly knowledgeTags: readonly string[];
  readonly skillTags: readonly string[];
}

interface CompactFullMock extends OriginalPracticeMetadata {
  readonly id: string;
  readonly exam: "UCAT";
  readonly edition: string;
  readonly sectionId: "decision-making";
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
  const content: QuestionBlock[] = passage.paragraphs.map(paragraph);
  if (passage.table !== undefined) {
    content.push({
      kind: "table",
      caption: passage.table.caption,
      headers: [...passage.table.headers],
      rows: passage.table.rows.map((row) => [...row]),
    });
  }
  return { id: passage.id, title: passage.title, content };
}

function expandStatement(statement: CompactStatement): PracticeStatement {
  return {
    id: statement.id,
    content: [paragraph(statement.text)],
    correctAnswer: statement.correctAnswer,
  };
}

function expandQuestion(question: CompactQuestion): PracticeQuestion {
  const isStatementSet = question.statements !== undefined;
  return {
    id: `ucat-decision-making-full-mock-v1-q${String(question.number).padStart(2, "0")}`,
    number: question.number,
    sourcePage: question.number,
    ...(question.passageId === undefined ? {} : { passageId: question.passageId }),
    ...(isStatementSet ? { responseMode: "statement-set" as const } : {}),
    prompt: [paragraph(question.prompt)],
    options: (question.options ?? []).map((value, index) => ({
      label: String.fromCharCode(65 + index),
      content: [paragraph(value)],
    })),
    ...(question.statements === undefined
      ? {}
      : {
          statements: question.statements.map(expandStatement),
          scoring: { kind: "statement-set-two-point" as const },
        }),
    correctAnswer: question.correctAnswer ?? "",
    knowledgeTags: [...question.knowledgeTags],
    skillTags: [...question.skillTags],
    reviewStatus: "verified",
    sourceQuestionPath: SOURCE_PATH,
    sourceAnswerPath: SOURCE_PATH,
  };
}

function loadUcatDecisionMakingFullMock(raw: unknown): OriginalChoiceStarter {
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

  const issues = validatePracticePaper(paper, { questionCount: 35 });
  const knowledgeTags = new Set(paper.questions.flatMap((question) => question.knowledgeTags));
  const statementSets = paper.questions.filter((question) => question.responseMode === "statement-set");
  const singleAnswerQuestions = paper.questions.filter((question) => question.responseMode !== "statement-set");
  const metadataIsValid =
    paper.schemaVersion === 1 &&
    paper.id === "ucat-decision-making-full-mock-v1" &&
    paper.exam === "UCAT" &&
    paper.sectionId === "decision-making" &&
    paper.durationMinutes === 37 &&
    paper.calculator === "basic" &&
    paper.deliveryMode === "structured" &&
    paper.publicationStatus === "teaching-preview" &&
    paper.authorship === "满托教研原创" &&
    paper.questions.length === 35 &&
    statementSets.length === 6 &&
    statementSets.every((question) => question.statements?.length === 5) &&
    singleAnswerQuestions.length === 29 &&
    singleAnswerQuestions.every((question) => question.options.length === 4) &&
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
      `Invalid UCAT Decision Making full mock: ${issues.map((issue) => issue.code).join(", ")}`,
    );
  }

  return paper;
}

export const UCAT_DECISION_MAKING_FULL_MOCK = loadUcatDecisionMakingFullMock(rawFullMock);
