import { describe, expect, it } from "vitest";
import {
  buildQuestionImportBundle,
  parseAnswerKey,
  parseQuestionPage,
  parseWorkedSolutions,
  verifyQuestionImportBundle,
} from "../../../src/content/tmua/extraction.js";
import type { ExtractedPdfPage } from "../../../src/content/tmua/pdf-tools.js";
import type { PaperRecord } from "../../../src/content/tmua/types.js";

function pages(values: string[]): ExtractedPdfPage[] {
  return values.map((layoutText, index) => ({ page: index + 1, layoutText }));
}

const paper: PaperRecord = {
  id: "tmua-2022-p1",
  edition: "2022",
  paper: 1,
  durationMinutes: 75,
  expectedQuestionCount: 20,
  questionSourceId: "question-source",
  answerSourceId: "answer-source",
  workedSolutionSourceId: "solution-source",
  completeness: "complete",
  contentStage: "indexed",
  onlineQuestionCount: 0,
  audit: {
    generatedAt: "2026-07-14T00:00:00.000Z",
    generatedBy: "tmua-corpus-cli",
    schemaVersion: 1,
    changeReason: "test",
  },
};

const source = (id: string) => ({
  id,
  portablePath: `Tmua/${id}.pdf`,
  sha256: "a".repeat(64),
});
describe("question page parsing", () => {
  it("separates a best-effort stem and options while preserving the source page", () => {
    const raw = [
      "1   A geometric sequence has positive terms.",
      "",
      "    What is its common ratio?",
      "",
      "    A   2",
      "",
      "    B   3",
      "",
      "    C   4",
      "",
      "                                        3",
    ].join("\n");

    expect(parseQuestionPage(1, 3, raw)).toMatchObject({
      sourcePageText: raw.trim(),
      stem: "A geometric sequence has positive terms.\n\n    What is its common ratio?",
      options: [
        { label: "A", rawText: "2" },
        { label: "B", rawText: "3" },
        { label: "C", rawText: "4" },
      ],
      warnings: ["math-transcription-required"],
    });
  });
});

describe("answer and solution linking", () => {
  it("selects the requested paper column from a two-column answer key", () => {
    const answerPages = pages(["1  C  1  B\n2  D  2  E"]);
    expect([...parseAnswerKey(answerPages, 1)]).toEqual([
      [1, { label: "C", page: 1 }],
      [2, { label: "D", page: 1 }],
    ]);
    expect([...parseAnswerKey(answerPages, 2)]).toEqual([
      [1, { label: "B", page: 1 }],
      [2, { label: "E", page: 1 }],
    ]);
  });

  it("keeps solution continuations and their page evidence together", () => {
    const solutionPages = pages([
      "Contents",
      "Question 1\nFirst part",
      "continued",
      "Question 2\nSecond solution",
    ]);
    expect(parseWorkedSolutions(solutionPages).get(1)).toEqual({
      rawText: "First part\n\f\ncontinued",
      pages: [2, 3],
    });
    expect(parseWorkedSolutions(solutionPages).get(2)).toEqual({
      rawText: "Second solution",
      pages: [4],
    });
  });
});

describe("question import bundle", () => {
  it("creates 20 non-publishable, source-linked question revisions", () => {
    const questionPages = pages([
      "Cover",
      "BLANK PAGE",
      ...Array.from({ length: 20 }, (_, index) => {
        const number = index + 1;
        return `${number}   Question ${number}?\n\n    A   first\n\n    B   second\n\n    C   third\n\n${number + 2}`;
      }),
    ]);
    const answerPages = pages([
      Array.from({ length: 20 }, (_, index) => `${index + 1}  A  ${index + 1}  B`).join("\n"),
    ]);
    const solutionPages = pages([
      "Contents",
      ...Array.from(
        { length: 20 },
        (_, index) => `Question ${index + 1}\nSolution ${index + 1}`,
      ),
    ]);
    const bundle = buildQuestionImportBundle({
      paper,
      questionSource: source("question-source"),
      answerSource: source("answer-source"),
      workedSolutionSource: source("solution-source"),
      questionPages,
      answerPages,
      workedSolutionPages: solutionPages,
      generatedAt: "2026-07-14T00:00:00.000Z",
    });

    expect(bundle.questionCount).toBe(20);
    expect(bundle.publishableQuestionCount).toBe(0);
    expect(bundle.questions[0]).toMatchObject({
      id: "tmua-2022-p1-q01",
      reviewStatus: "needs_review",
      correctAnswer: "A",
      sourceRefs: [
        { role: "question", pages: [3] },
        { role: "answer_key", pages: [1] },
        { role: "worked_solution", pages: [2] },
      ],
    });
    expect(verifyQuestionImportBundle(bundle)).toEqual([]);
  });
});
