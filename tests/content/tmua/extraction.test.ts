import { describe, expect, it } from "vitest";
import {
  buildQuestionImportBundle,
  parseAnswerKey,
  parseQuestionPage,
  parseWorkedSolutions,
  resolveQuestionPages,
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

  it("uses an audited page map even when the question number is not the first page line", () => {
    const pageMap = Array.from({ length: 20 }, (_, index) => index + 3);
    const questionPages = pages([
      "Cover",
      "Instructions",
      ...Array.from(
        { length: 20 },
        (_, index) => `TMUA header\n${index + 1}. Question ${index + 1}\n    A   first\n    B   second`,
      ),
    ]);

    const located = resolveQuestionPages(questionPages, pageMap);

    expect(located.get(1)).toMatchObject({ page: 3 });
    expect(located.get(20)).toMatchObject({ page: 22 });
  });

  it("safely separates multiple questions that share one audited source page", () => {
    const pageMap = [
      3,
      3,
      ...Array.from({ length: 18 }, (_, index) => index + 4),
    ];
    const questionPages = pages([
      "Cover",
      "Instructions",
      [
        "Running header",
        "1. First question?",
        "    A   one",
        "    B   two",
        "2  Second question?",
        "    A   three",
        "    B   four",
        "3",
      ].join("\n"),
      ...Array.from(
        { length: 18 },
        (_, index) => `${index + 3} Question ${index + 3}\n    A   first\n    B   second`,
      ),
    ]);

    const located = resolveQuestionPages(questionPages, pageMap);

    expect(parseQuestionPage(1, 3, located.get(1)!.layoutText).stem).toBe("First question?");
    expect(parseQuestionPage(2, 3, located.get(2)!.layoutText).stem).toBe("Second question?");
  });

  it("fails closed when an audited shared-page boundary cannot be located", () => {
    const pageMap = [3, 3, ...Array.from({ length: 18 }, (_, index) => index + 4)];
    const questionPages = pages([
      "Cover",
      "Instructions",
      "1 First question\n    A   one\n    B   two\nmissing second marker",
      ...Array.from(
        { length: 18 },
        (_, index) => `${index + 3} Question ${index + 3}\n    A   first\n    B   second`,
      ),
    ]);

    expect(() => resolveQuestionPages(questionPages, pageMap)).toThrow(
      "Question 2 shares source page 3, but its boundary could not be safely located",
    );
  });

  it("rejects incomplete and missing audited page maps", () => {
    expect(() => resolveQuestionPages(pages(["one"]), [1])).toThrow(
      "Audited question page map must contain 20 positive page numbers",
    );
    expect(() =>
      resolveQuestionPages(
        pages(["one"]),
        Array.from({ length: 20 }, () => 2),
      ),
    ).toThrow("Audited question source page 2 was not found in the PDF");
  });

  it("keeps graphical options as explicitly non-final placeholders in extraction drafts", () => {
    const parsed = parseQuestionPage(
      17,
      19,
      "17 Which sketch is correct?\n    A       B       C\n    D       E\n19",
      { allowOptionPlaceholders: true, expectedAnswer: "E" },
    );

    expect(parsed.options).toHaveLength(8);
    expect(parsed.options[4]).toEqual({
      label: "E",
      rawText: "[visual option E; transcription required]",
    });
    expect(parsed.warnings).toContain("visual-option-transcription-required");
    expect(parsed.warnings).toContain("option-count-review");
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

  it("reads answer keys that place the two papers in separate sections", () => {
    const answerPages = pages([
      "PAPER 1\nQuestion Key\n 1 D\n 2 C\n\nPAPER 2\nQuestion Key\n 1 C\n 2 B",
    ]);
    expect([...parseAnswerKey(answerPages, 1)]).toEqual([
      [1, { label: "D", page: 1 }],
      [2, { label: "C", page: 1 }],
    ]);
    expect([...parseAnswerKey(answerPages, 2)]).toEqual([
      [1, { label: "C", page: 1 }],
      [2, { label: "B", page: 1 }],
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
