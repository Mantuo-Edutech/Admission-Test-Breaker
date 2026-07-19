import { describe, expect, it } from "vitest";
import {
  TARA_CRITICAL_THINKING_FULL_MOCK,
  TARA_PROBLEM_SOLVING_FULL_MOCK,
} from "../../../../src/features/practice/content/tara-full-mocks.js";
import { getPracticePaper, loadPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

const sourceHashes = [
  "d326e78305aefd999c42953de3024d403f27357ecbc0f3dd562134e8105822cd",
  "afcee1ff9dd35025000cd7c5a4cef804fa31fb3e8870d5748ec8d3ac2c45a6cb",
];

describe("TARA original full-length reasoning mocks", () => {
  it.each([
    [TARA_CRITICAL_THINKING_FULL_MOCK, "critical-thinking"],
    [TARA_PROBLEM_SOLVING_FULL_MOCK, "problem-solving"],
  ] as const)("loads %s as a native 22-question, 40-minute module", async (paper, sectionId) => {
    expect(paper).toMatchObject({
      exam: "TARA",
      sectionId,
      durationMinutes: 40,
      calculator: "none",
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(paper.questions).toHaveLength(22);
    expect(paper.questions.every((question) => question.options.length === 5)).toBe(true);
    expect(validatePracticePaper(paper)).toEqual([]);
    expect(await loadPracticePaper(paper.id)).toBe(paper);
    expect(getPracticePaper(paper.id)).toBe(paper);
  });

  it("pins independently checked Critical Thinking answers and all seven official families", () => {
    expect(TARA_CRITICAL_THINKING_FULL_MOCK.questions.map((question) => question.correctAnswer).join(""))
      .toBe("DBCADBCCABCDBDBDCAEBAC");
    expect(new Set(TARA_CRITICAL_THINKING_FULL_MOCK.questions.flatMap((question) => question.knowledgeTags)))
      .toEqual(new Set([
        "tara-critical-main-conclusion",
        "tara-critical-inference",
        "tara-critical-assumption",
        "tara-critical-evidence",
        "tara-critical-flaw",
        "tara-critical-matching-arguments",
        "tara-critical-applying-principles",
      ]));
  });

  it("pins independently recalculated Problem Solving results and all three official families", () => {
    expect(TARA_PROBLEM_SOLVING_FULL_MOCK.questions.map((question) => question.correctAnswer).join(""))
      .toBe("CBDBBCDCDBBDCECDBCDAEC");
    const selectedAnswers = TARA_PROBLEM_SOLVING_FULL_MOCK.questions.map((question) => {
      const selected = question.options.find((option) => option.label === question.correctAnswer);
      const block = selected?.content[0];
      return block?.kind === "paragraph" && block.runs[0]?.kind === "text" ? block.runs[0].value : "";
    });
    expect(selectedAnswers).toEqual([
      "14:23", "8", "36", "£144", "2", "1.5 km", "12", "£66", "3.6 m", "Train B", "6",
      "33", "25", "600", "90 cm²", "247", "72", "Thursday", "14", "£200", "750 g", "Wednesday",
    ]);
    const tags = new Set(TARA_PROBLEM_SOLVING_FULL_MOCK.questions.flatMap((question) => question.knowledgeTags));
    expect(tags.size).toBe(8);
    expect(tags.has("tara-problem-relevant-selection")).toBe(true);
    expect(tags.has("tara-problem-finding-procedures")).toBe(true);
    expect(tags.has("tara-problem-identifying-similarity")).toBe(true);
  });

  it("keeps official anchors internal and exposes no source-PDF question blocks", () => {
    for (const paper of [TARA_CRITICAL_THINKING_FULL_MOCK, TARA_PROBLEM_SOLVING_FULL_MOCK]) {
      expect(paper.sourceAnchors.map((source) => source.sha256)).toEqual(sourceHashes);
      expect(paper.questions.flatMap((question) => [
        ...question.prompt,
        ...question.options.flatMap((option) => option.content),
      ]).every((block) => block.kind !== "source-pdf")).toBe(true);
    }
  });
});
