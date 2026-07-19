import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TMUA_2022_P1 } from "../../../../src/features/practice/content/tmua-2022-p1.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

const expectedAnswers = "CDFCHFEBECADADHBDBFB".split("");

describe("TMUA 2022 Paper 1 reviewed native content", () => {
  it("contains all 20 source-reviewed questions and the audited answer sequence", () => {
    expect(TMUA_2022_P1).toMatchObject({
      id: "tmua-2022-p1",
      durationMinutes: 75,
      deliveryMode: "structured",
    });
    expect(TMUA_2022_P1.questions.map((question) => question.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(TMUA_2022_P1.questions.map((question) => question.sourcePage)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 3),
    );
    expect(TMUA_2022_P1.questions.map((question) => question.correctAnswer)).toEqual(
      expectedAnswers,
    );
    expect(validatePracticePaper(TMUA_2022_P1)).toEqual([]);
  });

  it("contains no embedded PDF blocks or PDF links", () => {
    expect(
      TMUA_2022_P1.questions.flatMap((question) => question.prompt).some(
        (block) => block.kind === "source-pdf",
      ),
    ).toBe(false);
    expect(JSON.stringify(TMUA_2022_P1)).not.toMatch(/\/papers\/|\.pdf#/u);
  });

  it("ships safe responsive SVG recreations for both source diagrams", () => {
    for (const filename of ["q04.svg", "q17.svg"]) {
      const svg = readFileSync(
        resolve(process.cwd(), "public/questions/tmua-2022-p1", filename),
        "utf8",
      );
      expect(svg).toContain("<svg");
      expect(svg).toMatch(/viewBox="[^"]+"/u);
      expect(svg).not.toMatch(/<(?:script|foreignObject)\b/iu);
      expect(svg).not.toMatch(/\b(?:href|xlink:href)=/iu);
    }
  });
});
