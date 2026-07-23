import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TMUA_2023_P1 } from "../../../../src/features/practice/content/tmua-2023-p1.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";
import type { PracticePaper } from "../../../../src/features/practice/content/types.js";

const expectedAnswers = "FACCFEFBEBBFFAFEEEDF".split("");

function esatMathematicsPaper(questionCount = 27): PracticePaper {
  const paperId = "esat-specimen-mathematics-1";
  return {
    id: paperId,
    exam: "ESAT",
    edition: "Specimen",
    sectionId: "mathematics-1",
    sectionLabel: "Mathematics 1",
    sectionLabelZh: "数学 1",
    durationMinutes: 40,
    deliveryMode: "structured",
    questions: Array.from({ length: questionCount }, (_, index) => {
      const number = index + 1;
      return {
        id: `${paperId}-q${String(number).padStart(2, "0")}`,
        number,
        sourcePage: number,
        prompt: [{ kind: "paragraph", runs: [{ kind: "text", value: `Question ${number}` }] }],
        options: ["A", "B", "C", "D"].map((label) => ({
          label,
          content: [{ kind: "paragraph", runs: [{ kind: "text", value: label }] }],
        })),
        correctAnswer: "A",
        knowledgeTags: ["algebra"],
        skillTags: ["reasoning"],
        reviewStatus: "verified" as const,
        sourceQuestionPath: "content/esat/specimen-mathematics-1.pdf",
        sourceAnswerPath: "content/esat/specimen-mathematics-1-answers.pdf",
      };
    }),
  };
}

describe("TMUA 2023 Paper 1 reviewed content", () => {
  it("contains the complete contiguous paper and reviewed answer sequence", () => {
    expect(TMUA_2023_P1.durationMinutes).toBe(75);
    expect(TMUA_2023_P1.questions).toHaveLength(20);
    expect(TMUA_2023_P1.questions.map((question) => question.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(TMUA_2023_P1.questions.map((question) => question.correctAnswer)).toEqual(
      expectedAnswers,
    );
    expect(
      TMUA_2023_P1.questions.every((question) => question.reviewStatus === "verified"),
    ).toBe(true);
    expect(validatePracticePaper(TMUA_2023_P1)).toEqual([]);
  });

  it("rejects unsafe provenance and a correct answer outside the options", () => {
    const broken: PracticePaper = structuredClone(TMUA_2023_P1);
    broken.questions[0]!.sourceQuestionPath = "../outside.pdf";
    broken.questions[0]!.correctAnswer = "Z";

    expect(validatePracticePaper(broken).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["unsafe-source-path", "missing-correct-option"]),
    );
  });

  it("validates a complete 27-question, 40-minute ESAT module", () => {
    expect(validatePracticePaper(esatMathematicsPaper())).toEqual([]);
    expect(validatePracticePaper(esatMathematicsPaper(26)).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["question-count", "question-sequence"]),
    );
  });

  it("rejects PDF blocks and remote figures inside a structured paper", () => {
    const broken: PracticePaper = structuredClone(TMUA_2023_P1);
    broken.questions[0]!.prompt = [
      {
        kind: "source-pdf",
        src: "/papers/tmua/complete-paper.pdf",
        page: 3,
        title: "Complete source PDF",
      },
      {
        kind: "figure",
        src: "https://example.com/question.svg",
        alt: "Remote question figure",
      },
    ];

    expect(validatePracticePaper(broken).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["structured-paper-pdf-block", "unsafe-figure-path"]),
    );
  });

  it("provides safe, responsive SVG assets for every reviewed source diagram", () => {
    for (const filename of ["q05.svg", "q17.svg", "q20.svg"]) {
      const svg = readFileSync(
        resolve(process.cwd(), "public/questions/tmua-2023-p1", filename),
        "utf8",
      );

      expect(svg).toContain("<svg");
      expect(svg).toMatch(/viewBox="[^"]+"/);
      expect(svg).not.toMatch(/<(?:script|foreignObject)\b/i);
      expect(svg).not.toMatch(/\b(?:href|xlink:href)=/i);
    }
  });

  it("describes the diagonal reflection axes in the Q5 figure alternative text", () => {
    const q5Figure = TMUA_2023_P1.questions[4]!.prompt.find(
      (block) => block.kind === "figure",
    );

    expect(q5Figure).toMatchObject({
      kind: "figure",
      alt: expect.stringContaining("diagonal reflectional symmetry"),
    });
  });
});
