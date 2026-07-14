import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { atomicWriteText } from "./fs-utils.js";
import type { ExtractedPdfPage } from "./pdf-tools.js";
import type {
  PaperRecord,
  QuestionImportBundle,
  QuestionRevisionDraft,
  QuestionSourceReference,
  ValidationIssue,
} from "./types.js";

export interface ExtractionSource {
  id: string;
  portablePath: string;
  sha256: string;
}

export interface ExtractPaperInput {
  paper: PaperRecord;
  questionSource: ExtractionSource;
  answerSource: ExtractionSource;
  workedSolutionSource: ExtractionSource;
  questionPages: ExtractedPdfPage[];
  answerPages: ExtractedPdfPage[];
  workedSolutionPages: ExtractedPdfPage[];
  generatedAt: string;
}

interface ParsedQuestionPage {
  sourcePageText: string;
  stem: string;
  options: Array<{ label: string; rawText: string }>;
  warnings: string[];
}

interface LocatedAnswer {
  label: string;
  page: number;
}

interface LocatedSolution {
  rawText: string;
  pages: number[];
}

interface OptionStart {
  lineIndex: number;
  label: string;
  firstLine: string;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function stripPhysicalPageFooter(lines: string[], physicalPage: number): string[] {
  const result = [...lines];
  while (result.at(-1)?.trim() === "") result.pop();
  if (result.at(-1)?.trim() === String(physicalPage)) result.pop();
  while (result.at(-1)?.trim() === "") result.pop();
  return result;
}

function optionCandidates(lines: string[]): OptionStart[] {
  return lines.flatMap((line, lineIndex) => {
    const match = line.match(/^\s{2,}([A-H])(?:\s+(.*))?$/u);
    if (match === null || match[1] === undefined) return [];
    return [{ lineIndex, label: match[1], firstLine: match[2] ?? "" }];
  });
}

function longestOptionSequence(candidates: OptionStart[]): OptionStart[] {
  let best: OptionStart[] = [];
  for (let startIndex = 0; startIndex < candidates.length; startIndex += 1) {
    if (candidates[startIndex]?.label !== "A") continue;
    const sequence = [candidates[startIndex]!];
    let expectedCode = "B".charCodeAt(0);
    for (let index = startIndex + 1; index < candidates.length; index += 1) {
      const candidate = candidates[index]!;
      const expected = String.fromCharCode(expectedCode);
      if (candidate.label === expected) {
        sequence.push(candidate);
        expectedCode += 1;
        if (candidate.label === "H") break;
      } else if (candidate.label === "A") {
        break;
      }
    }
    if (sequence.length > best.length) best = sequence;
  }
  return best;
}

export function parseQuestionPage(
  questionNumber: number,
  physicalPage: number,
  layoutText: string,
): ParsedQuestionPage {
  const sourcePageText = layoutText.trim();
  const lines = stripPhysicalPageFooter(sourcePageText.split("\n"), physicalPage);
  const firstContentLine = lines.findIndex((line) => line.trim() !== "");
  if (firstContentLine < 0) throw new Error(`Question ${questionNumber} page is empty`);

  lines[firstContentLine] = lines[firstContentLine]!.replace(
    new RegExp(`^\\s*${questionNumber}(?:\\s+|$)`, "u"),
    "",
  );

  const starts = longestOptionSequence(optionCandidates(lines));
  if (starts.length < 2) {
    throw new Error(`Question ${questionNumber} has fewer than two parsed options`);
  }

  const stem = lines.slice(0, starts[0]!.lineIndex).join("\n").trim();
  if (stem === "") throw new Error(`Question ${questionNumber} has an empty parsed stem`);

  const options = starts.map((start, index) => {
    const next = starts[index + 1];
    const continuation = lines.slice(start.lineIndex + 1, next?.lineIndex ?? lines.length);
    const rawText = [start.firstLine, ...continuation].join("\n").trim();
    if (rawText === "") {
      throw new Error(`Question ${questionNumber} option ${start.label} is empty`);
    }
    return { label: start.label, rawText };
  });

  const warnings = ["math-transcription-required"];
  if (/[ൌșƎ³ʌ]/u.test(sourcePageText)) {
    warnings.push("pdf-font-mapping-anomaly");
  }
  const expectedLabels = Array.from({ length: options.length }, (_, index) =>
    String.fromCharCode(65 + index),
  );
  if (options.map((option) => option.label).join("") !== expectedLabels.join("")) {
    warnings.push("option-label-sequence-review");
  }

  return { sourcePageText, stem, options, warnings };
}

function locateQuestionPages(pages: ExtractedPdfPage[]): Map<number, ExtractedPdfPage> {
  const located = new Map<number, ExtractedPdfPage>();
  for (const page of pages) {
    const firstLine = page.layoutText
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line !== "");
    const match = firstLine?.match(/^(\d{1,2})(?:\s+.*)?$/u);
    if (match?.[1] === undefined) continue;
    const number = Number.parseInt(match[1], 10);
    if (number >= 1 && number <= 20 && !located.has(number)) {
      located.set(number, page);
    }
  }
  return located;
}

export function parseAnswerKey(
  pages: ExtractedPdfPage[],
  paper: 1 | 2,
): Map<number, LocatedAnswer> {
  const answers = new Map<number, LocatedAnswer>();
  const pairPattern = /^\s*(\d{1,2})\s+([A-H])\s+(\d{1,2})\s+([A-H])\s*$/gmu;
  for (const page of pages) {
    for (const match of page.layoutText.matchAll(pairPattern)) {
      const number = Number.parseInt(paper === 1 ? match[1]! : match[3]!, 10);
      const label = paper === 1 ? match[2]! : match[4]!;
      if (number >= 1 && number <= 20) answers.set(number, { label, page: page.page });
    }
  }
  return answers;
}

export function parseWorkedSolutions(
  pages: ExtractedPdfPage[],
): Map<number, LocatedSolution> {
  const solutions = new Map<number, LocatedSolution>();
  let currentNumber: number | null = null;
  let currentPages: number[] = [];
  let currentParts: string[] = [];

  function flush() {
    if (currentNumber === null) return;
    const rawText = currentParts.join("\n\f\n").trim();
    if (rawText !== "") solutions.set(currentNumber, { rawText, pages: currentPages });
  }

  for (const page of pages) {
    const match = page.layoutText.match(/^\s*Question\s+(\d{1,2})\s*$/mu);
    if (match?.[1] !== undefined) {
      flush();
      currentNumber = Number.parseInt(match[1], 10);
      currentPages = [page.page];
      currentParts = [page.layoutText.slice((match.index ?? 0) + match[0].length).trim()];
    } else if (currentNumber !== null) {
      currentPages.push(page.page);
      currentParts.push(page.layoutText.trim());
    }
  }
  flush();
  return solutions;
}

function sourceRef(
  role: QuestionSourceReference["role"],
  source: ExtractionSource,
  pages: number[],
): QuestionSourceReference {
  return {
    role,
    sourceId: source.id,
    portablePath: source.portablePath,
    sha256: source.sha256,
    pages,
  };
}

export function buildQuestionImportBundle(input: ExtractPaperInput): QuestionImportBundle {
  const questionPages = locateQuestionPages(input.questionPages);
  const answers = parseAnswerKey(input.answerPages, input.paper.paper);
  const solutions = parseWorkedSolutions(input.workedSolutionPages);
  const questions: QuestionRevisionDraft[] = [];

  for (let questionNumber = 1; questionNumber <= 20; questionNumber += 1) {
    const page = questionPages.get(questionNumber);
    const answer = answers.get(questionNumber);
    const solution = solutions.get(questionNumber);
    if (page === undefined) throw new Error(`Question ${questionNumber} source page was not found`);
    if (answer === undefined) throw new Error(`Question ${questionNumber} answer was not found`);
    if (solution === undefined) throw new Error(`Question ${questionNumber} solution was not found`);

    const parsed = parseQuestionPage(questionNumber, page.page, page.layoutText);
    if (!parsed.options.some((option) => option.label === answer.label)) {
      throw new Error(
        `Question ${questionNumber} official answer ${answer.label} is not a parsed option`,
      );
    }

    questions.push({
      schemaVersion: 1,
      id: `${input.paper.id}-q${String(questionNumber).padStart(2, "0")}`,
      revision: 1,
      exam: "TMUA",
      paperId: input.paper.id,
      edition: input.paper.edition,
      paper: input.paper.paper,
      questionNumber,
      sourceType: "past_paper",
      contentStage: "extracted",
      reviewStatus: "needs_review",
      sourcePage: { format: "pdf-layout-text", rawText: parsed.sourcePageText },
      stem: { format: "pdf-layout-text", rawText: parsed.stem },
      options: parsed.options,
      correctAnswer: answer.label,
      solution: { format: "pdf-layout-text", rawText: solution.rawText },
      sourceRefs: [
        sourceRef("question", input.questionSource, [page.page]),
        sourceRef("answer_key", input.answerSource, [answer.page]),
        sourceRef("worked_solution", input.workedSolutionSource, solution.pages),
      ],
      knowledgeTags: [],
      skillTags: [],
      errorTypes: [],
      extraction: {
        generatedAt: input.generatedAt,
        generatedBy: "tmua-extraction-cli",
        method: "poppler-layout-text",
        mathFidelity: "needs_review",
        warnings: parsed.warnings,
      },
    });
  }

  return {
    schemaVersion: 1,
    bundleType: "question-import",
    id: `${input.paper.id}-extraction-v1`,
    exam: "TMUA",
    paperId: input.paper.id,
    edition: input.paper.edition,
    paper: input.paper.paper,
    generatedAt: input.generatedAt,
    generatedBy: "tmua-extraction-cli",
    sourceDocumentIds: {
      question: input.questionSource.id,
      answerKey: input.answerSource.id,
      workedSolution: input.workedSolutionSource.id,
    },
    questionCount: questions.length,
    publishableQuestionCount: 0,
    questions,
  };
}

export function verifyQuestionImportBundle(bundle: QuestionImportBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (bundle.questionCount !== 20 || bundle.questions.length !== 20) {
    issues.push({ severity: "P0", code: "extraction-question-count", message: "Bundle must contain 20 questions" });
  }
  const numbers = bundle.questions.map((question) => question.questionNumber);
  if (numbers.join(",") !== Array.from({ length: 20 }, (_, index) => index + 1).join(",")) {
    issues.push({ severity: "P0", code: "extraction-question-sequence", message: "Question numbers must be 1 through 20" });
  }
  if (bundle.publishableQuestionCount !== 0) {
    issues.push({ severity: "P0", code: "extraction-publishable", message: "Auto-extracted questions cannot be publishable" });
  }
  for (const question of bundle.questions) {
    if (question.reviewStatus !== "needs_review" || question.contentStage !== "extracted") {
      issues.push({ severity: "P0", code: "extraction-review-boundary", message: `${question.id} bypasses review`, path: question.id });
    }
    if (!question.options.some((option) => option.label === question.correctAnswer)) {
      issues.push({ severity: "P0", code: "extraction-answer-option", message: `${question.id} answer is missing from options`, path: question.id });
    }
    const roles = question.sourceRefs.map((reference) => reference.role).sort().join(",");
    if (roles !== "answer_key,question,worked_solution") {
      issues.push({ severity: "P0", code: "extraction-source-roles", message: `${question.id} must link question, answer key and worked solution evidence`, path: question.id });
    }
  }
  return issues;
}

export async function writeQuestionImportBundle(
  outputDirectory: string,
  bundle: QuestionImportBundle,
): Promise<void> {
  await mkdir(join(outputDirectory, "questions"), { recursive: true });
  await Promise.all([
    atomicWriteText(join(outputDirectory, "bundle.json"), json(bundle)),
    atomicWriteText(
      join(outputDirectory, "extraction-report.json"),
      json({
        schemaVersion: 1,
        bundleId: bundle.id,
        questionCount: bundle.questionCount,
        publishableQuestionCount: bundle.publishableQuestionCount,
        reviewStatus: "needs_review",
        warnings: bundle.questions.reduce(
          (count, question) => count + question.extraction.warnings.length,
          0,
        ),
      }),
    ),
    ...bundle.questions.map((question) =>
      atomicWriteText(
        join(outputDirectory, "questions", `${question.id}.json`),
        json(question),
      ),
    ),
  ]);
}
