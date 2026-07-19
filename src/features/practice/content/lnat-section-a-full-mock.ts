import rawFullMock from "../../../../content/lnat/original-practice/section-a-full-mock-v1.json" with { type: "json" };
import type { OriginalChoiceStarter, OriginalPracticeMetadata } from "./esat-original-starter.js";
import type { PracticePaper, PracticePassage, PracticeQuestion, QuestionBlock } from "./types.js";
import { validatePracticePaper } from "./validate.js";

const SOURCE_PATH = "content/lnat/original-practice/section-a-full-mock-v1.json";
const REQUIRED_KNOWLEDGE_TAGS = [
  "lnat-main-conclusion",
  "lnat-argument-role",
  "lnat-context-meaning",
  "lnat-evidence-evaluation",
  "lnat-evidence-limit",
  "lnat-inference",
  "lnat-principle",
  "lnat-qualification",
  "lnat-recommendation",
  "lnat-strengthen",
  "lnat-analogy",
] as const;

interface CompactPassage {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
}

interface CompactQuestion {
  readonly number: number;
  readonly passageId: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctAnswer: string;
  readonly knowledgeTags: readonly string[];
  readonly skillTags: readonly string[];
}

interface CompactFullMock extends OriginalPracticeMetadata {
  readonly id: string;
  readonly exam: "LNAT";
  readonly edition: string;
  readonly sectionLabel: string;
  readonly sectionLabelZh: string;
  readonly durationMinutes: number;
  readonly deliveryMode: "structured";
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
    content: passage.paragraphs.map(paragraph),
  };
}

function expandQuestion(question: CompactQuestion): PracticeQuestion {
  return {
    id: `lnat-section-a-full-mock-v1-q${String(question.number).padStart(2, "0")}`,
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

function loadLnatSectionAFullMock(raw: unknown): OriginalChoiceStarter {
  const source = raw as CompactFullMock;
  const paper: PracticePaper & OriginalPracticeMetadata = {
    schemaVersion: source.schemaVersion,
    id: source.id,
    exam: source.exam,
    edition: source.edition,
    sectionLabel: source.sectionLabel,
    sectionLabelZh: source.sectionLabelZh,
    durationMinutes: source.durationMinutes,
    deliveryMode: source.deliveryMode,
    publicationStatus: source.publicationStatus,
    authorship: source.authorship,
    rightsNotice: source.rightsNotice,
    sourceAnchors: source.sourceAnchors,
    passages: source.passages.map(expandPassage),
    questions: source.questions.map(expandQuestion),
  };
  const issues = validatePracticePaper(paper, { questionCount: 42 });
  const passageCounts = new Map<string, number>();
  for (const question of paper.questions) {
    if (question.passageId !== undefined) {
      passageCounts.set(question.passageId, (passageCounts.get(question.passageId) ?? 0) + 1);
    }
  }
  const knowledgeTags = new Set(paper.questions.flatMap((question) => question.knowledgeTags));
  const metadataIsValid =
    paper.schemaVersion === 1 &&
    paper.id === "lnat-section-a-full-mock-v1" &&
    paper.exam === "LNAT" &&
    paper.durationMinutes === 95 &&
    paper.publicationStatus === "teaching-preview" &&
    paper.authorship === "满托教研原创" &&
    paper.passages?.length === 12 &&
    paper.questions.length === 42 &&
    paper.questions.every((question) => question.options.length === 4) &&
    [...passageCounts.values()].filter((count) => count === 4).length === 6 &&
    [...passageCounts.values()].filter((count) => count === 3).length === 6 &&
    REQUIRED_KNOWLEDGE_TAGS.every((tag) => knowledgeTags.has(tag)) &&
    paper.sourceAnchors.length === 2 &&
    paper.sourceAnchors.every((sourceAnchor) =>
      sourceAnchor.localPath.startsWith("content/official/raw/lnat/") &&
      /^[a-f0-9]{64}$/u.test(sourceAnchor.sha256)
    );

  if (issues.length > 0 || !metadataIsValid) {
    throw new Error(`Invalid LNAT Section A full mock: ${issues.map((issue) => issue.code).join(", ")}`);
  }
  return paper;
}

export const LNAT_SECTION_A_FULL_MOCK = loadLnatSectionAFullMock(rawFullMock);
