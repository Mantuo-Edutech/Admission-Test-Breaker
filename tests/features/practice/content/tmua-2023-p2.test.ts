import { describe, expect, it } from "vitest";
import { TMUA_2023_P2 } from "../../../../src/features/practice/content/tmua-2023-p2.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

const expectedAnswers = "HFCGAFEDDAGCCFBBFDHD".split("");

describe("TMUA 2023 Paper 2 reviewed native content", () => {
  it("contains all 20 visually reviewed questions and audited answers", () => {
    expect(TMUA_2023_P2).toMatchObject({
      id: "tmua-2023-p2",
      paper: 2,
      durationMinutes: 75,
      deliveryMode: "structured",
    });
    expect(TMUA_2023_P2.questions.map((question) => question.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(TMUA_2023_P2.questions.map((question) => question.sourcePage)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 3),
    );
    expect(TMUA_2023_P2.questions.map((question) => question.correctAnswer)).toEqual(
      expectedAnswers,
    );
    expect(validatePracticePaper(TMUA_2023_P2)).toEqual([]);
  });

  it("contains semantic text and KaTeX only, without PDF or figure dependencies", () => {
    const blocks = TMUA_2023_P2.questions.flatMap((question) => [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
    ]);

    expect(blocks.some((block) => block.kind === "source-pdf")).toBe(false);
    expect(blocks.some((block) => block.kind === "figure")).toBe(false);
    expect(JSON.stringify(TMUA_2023_P2)).not.toMatch(/\/papers\/|\.pdf#/u);
  });
});
