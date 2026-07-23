import rawFullMock from "../../../../content/ucat/original-practice/situational-judgement-full-mock-v1.json" with { type: "json" };
import type { OriginalChoiceStarter, OriginalPracticeMetadata } from "./esat-original-starter.js";
import type { PracticePaper, PracticePassage, PracticeQuestion, QuestionBlock } from "./types.js";
import { validatePracticePaper } from "./validate.js";
import { serializeMostLeastAnswer } from "../domain/most-least-response.js";

const SOURCE_PATH = "content/ucat/original-practice/situational-judgement-full-mock-v1.json";
const REQUIRED_KNOWLEDGE_TAGS = [
  "ucat-sjt-patient-safety",
  "ucat-sjt-speaking-up",
  "ucat-sjt-confidentiality",
  "ucat-sjt-respect",
  "ucat-sjt-teamwork",
  "ucat-sjt-wellbeing-support",
  "ucat-sjt-boundaries",
  "ucat-sjt-competence-scope",
  "ucat-sjt-communication",
  "ucat-sjt-patient-perspective",
  "ucat-sjt-honesty",
  "ucat-sjt-inclusion-respect",
  "ucat-sjt-research-integrity",
] as const;

interface CompactRatingItem {
  readonly prompt: string;
  readonly answer: "A" | "B" | "C" | "D";
  readonly skillTags: readonly string[];
}

interface CompactRatingScenario {
  readonly id: string;
  readonly title: string;
  readonly questionType: "appropriateness" | "importance";
  readonly context: string;
  readonly knowledgeTags: readonly string[];
  readonly items: readonly CompactRatingItem[];
}

interface CompactMostLeastScenario {
  readonly id: string;
  readonly title: string;
  readonly questionType: "most-least";
  readonly context: string;
  readonly knowledgeTags: readonly string[];
  readonly prompt: string;
  readonly actions: readonly [string, string, string];
  readonly most: "A" | "B" | "C";
  readonly least: "A" | "B" | "C";
  readonly skillTags: readonly string[];
}

type CompactScenario = CompactRatingScenario | CompactMostLeastScenario;

interface CompactFullMock extends OriginalPracticeMetadata {
  readonly id: "ucat-situational-judgement-full-mock-v1";
  readonly exam: "UCAT";
  readonly edition: string;
  readonly sectionId: "situational-judgement";
  readonly sectionLabel: string;
  readonly sectionLabelZh: string;
  readonly durationMinutes: 26;
  readonly deliveryMode: "structured";
  readonly responseMode: "choice";
  readonly calculator: "none";
  readonly scoringNotice: string;
  readonly scenarios: readonly CompactScenario[];
}

export type UcatSituationalJudgementFullMock = OriginalChoiceStarter & {
  readonly scoringNotice: string;
};

const APPROPRIATENESS_SCALE = [
  "Very appropriate",
  "Appropriate, but not ideal",
  "Inappropriate, but not awful",
  "Very inappropriate",
] as const;

const IMPORTANCE_SCALE = [
  "Very important",
  "Important",
  "Of minor importance",
  "Not important at all",
] as const;

function paragraph(value: string): QuestionBlock {
  return { kind: "paragraph", runs: [{ kind: "text", value }] };
}

function expandPassage(scenario: CompactScenario): PracticePassage {
  return { id: scenario.id, title: scenario.title, content: [paragraph(scenario.context)] };
}

function ratingQuestion(
  paperId: string,
  scenario: CompactRatingScenario,
  item: CompactRatingItem,
  number: number,
  sourcePage: number,
): PracticeQuestion {
  const scale = scenario.questionType === "appropriateness" ? APPROPRIATENESS_SCALE : IMPORTANCE_SCALE;
  return {
    id: `${paperId}-q${String(number).padStart(2, "0")}`,
    number,
    sourcePage,
    passageId: scenario.id,
    responseMode: "ordinal-choice",
    prompt: [paragraph(item.prompt)],
    options: scale.map((value, index) => ({
      label: String.fromCharCode(65 + index),
      content: [paragraph(value)],
    })),
    correctAnswer: item.answer,
    scoring: { kind: "adjacent-partial", order: ["A", "B", "C", "D"] },
    knowledgeTags: [...scenario.knowledgeTags],
    skillTags: [scenario.questionType, ...item.skillTags],
    reviewStatus: "verified",
    sourceQuestionPath: SOURCE_PATH,
    sourceAnswerPath: SOURCE_PATH,
  };
}

function mostLeastQuestion(
  paperId: string,
  scenario: CompactMostLeastScenario,
  number: number,
  sourcePage: number,
): PracticeQuestion {
  return {
    id: `${paperId}-q${String(number).padStart(2, "0")}`,
    number,
    sourcePage,
    passageId: scenario.id,
    responseMode: "most-least-choice",
    prompt: [paragraph(scenario.prompt)],
    options: scenario.actions.map((value, index) => ({
      label: String.fromCharCode(65 + index),
      content: [paragraph(value)],
    })),
    correctAnswer: serializeMostLeastAnswer({ most: scenario.most, least: scenario.least }),
    scoring: { kind: "most-least-exact" },
    knowledgeTags: [...scenario.knowledgeTags],
    skillTags: ["most-least", ...scenario.skillTags],
    reviewStatus: "verified",
    sourceQuestionPath: SOURCE_PATH,
    sourceAnswerPath: SOURCE_PATH,
  };
}

function loadUcatSituationalJudgementFullMock(raw: unknown): UcatSituationalJudgementFullMock {
  const source = raw as CompactFullMock;
  let nextNumber = 1;
  const questions = source.scenarios.flatMap((scenario, scenarioIndex) => {
    if (scenario.questionType === "most-least") {
      return [mostLeastQuestion(source.id, scenario, nextNumber++, scenarioIndex + 1)];
    }
    return scenario.items.map((item) =>
      ratingQuestion(source.id, scenario, item, nextNumber++, scenarioIndex + 1)
    );
  });
  const paper: PracticePaper & OriginalPracticeMetadata & { scoringNotice: string } = {
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
    passages: source.scenarios.map(expandPassage),
    questions,
    publicationStatus: source.publicationStatus,
    authorship: source.authorship,
    rightsNotice: source.rightsNotice,
    sourceAnchors: source.sourceAnchors,
    scoringNotice: source.scoringNotice,
  };

  const issues = validatePracticePaper(paper, { questionCount: 69 });
  const ratingScenarios = source.scenarios.filter(
    (scenario): scenario is CompactRatingScenario => scenario.questionType !== "most-least",
  );
  const mostLeastScenarios = source.scenarios.filter(
    (scenario): scenario is CompactMostLeastScenario => scenario.questionType === "most-least",
  );
  const knowledgeTags = new Set(questions.flatMap((question) => question.knowledgeTags));
  const metadataIsValid =
    source.schemaVersion === 1 &&
    source.id === "ucat-situational-judgement-full-mock-v1" &&
    source.exam === "UCAT" &&
    source.sectionId === "situational-judgement" &&
    source.durationMinutes === 26 &&
    source.deliveryMode === "structured" &&
    source.calculator === "none" &&
    source.publicationStatus === "teaching-preview" &&
    source.authorship === "满托教研原创" &&
    source.scenarios.length === 21 &&
    ratingScenarios.length === 12 &&
    ratingScenarios.filter((scenario) => scenario.questionType === "appropriateness").length === 6 &&
    ratingScenarios.filter((scenario) => scenario.questionType === "importance").length === 6 &&
    ratingScenarios.every((scenario) => scenario.items.length === 5) &&
    mostLeastScenarios.length === 9 &&
    mostLeastScenarios.every((scenario) => scenario.most !== scenario.least) &&
    questions.length === 69 &&
    questions.filter((question) => question.responseMode === "ordinal-choice").length === 60 &&
    questions.filter((question) => question.responseMode === "most-least-choice").length === 9 &&
    source.sourceAnchors.length === 3 &&
    source.sourceAnchors.every((anchor) =>
      anchor.localPath.startsWith("content/official/raw/") && /^[a-f0-9]{64}$/u.test(anchor.sha256)
    ) &&
    REQUIRED_KNOWLEDGE_TAGS.every((tag) => knowledgeTags.has(tag)) &&
    questions.every((question) =>
      question.sourceQuestionPath === SOURCE_PATH && question.sourceAnswerPath === SOURCE_PATH
    );

  if (issues.length > 0 || !metadataIsValid) {
    throw new Error(
      `Invalid UCAT Situational Judgement full mock: ${issues.map((issue) => issue.code).join(", ")}`,
    );
  }
  return paper;
}

export const UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK = loadUcatSituationalJudgementFullMock(rawFullMock);
