import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TMUA_2022_P2 } from "../../../../src/features/practice/content/tmua-2022-p2.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("TMUA 2022 Paper 2 reviewed native content", () => {
  it("contains all questions, pages and audited answers", () => {
    expect(TMUA_2022_P2.questions.map((question) => question.correctAnswer).join("")).toBe("BECBFCFCAGCFEDFDEEBE");
    expect(TMUA_2022_P2.questions.map((question) => question.sourcePage)).toEqual(Array.from({ length: 20 }, (_, index) => index + 3));
    expect(validatePracticePaper(TMUA_2022_P2)).toEqual([]);
  });
  it("uses only safe repository SVG figures", () => {
    for (const filename of ["q11.svg", "q18.svg"]) {
      const svg = readFileSync(resolve(`public/questions/tmua-2022-p2/${filename}`), "utf8");
      expect(svg).toContain("<svg");
      expect(svg).not.toMatch(/<(?:script|foreignObject)\b|\b(?:href|xlink:href)=/iu);
    }
  });
});
