import { describe, expect, it } from "vitest";
import { TMUA_2021_P2 } from "../../../../src/features/practice/content/tmua-2021-p2.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("TMUA 2021 Paper 2 native content", () => {
  it("contains twenty verified structured questions", () => {
    expect(TMUA_2021_P2.questions).toHaveLength(20);
    expect(TMUA_2021_P2.deliveryMode).toBe("structured");
    expect(TMUA_2021_P2.questions.map((question) => question.correctAnswer).join("")).toBe("DECCBDBCCECBACBEFCFE");
    expect(validatePracticePaper(TMUA_2021_P2)).toEqual([]);
  });

  it("uses semantic blocks instead of PDF pages", () => {
    expect(TMUA_2021_P2.questions.flatMap((question) => question.prompt).every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(TMUA_2021_P2.questions.flatMap((question) => question.prompt).some((block) => block.kind === "display-math")).toBe(true);
  });
});
