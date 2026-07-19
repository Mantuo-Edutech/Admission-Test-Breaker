import { describe, expect, it } from "vitest";
import { ESAT_MATHEMATICS_1_STARTER } from "../../../../src/features/practice/content/esat-mathematics-1-starter.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("ESAT Mathematics 1 original starter diagnostic", () => {
  it("is a complete runnable 10-question, 20-minute structured paper", () => {
    expect(ESAT_MATHEMATICS_1_STARTER).toMatchObject({
      id: "esat-mathematics-1-starter-v1",
      exam: "ESAT",
      durationMinutes: 20,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(ESAT_MATHEMATICS_1_STARTER.questions).toHaveLength(10);
    expect(validatePracticePaper(ESAT_MATHEMATICS_1_STARTER)).toEqual([]);
    expect(getPracticePaper(ESAT_MATHEMATICS_1_STARTER.id)).toBe(ESAT_MATHEMATICS_1_STARTER);
  });

  it("pins the reviewed answer sequence and all seven Mathematics 1 scope areas", () => {
    expect(ESAT_MATHEMATICS_1_STARTER.questions.map((question) => question.correctAnswer).join(""))
      .toBe("BCCBBCDBBC");
    expect(new Set(ESAT_MATHEMATICS_1_STARTER.questions.flatMap((question) => question.knowledgeTags)))
      .toEqual(new Set([
        "m1-units",
        "m1-number",
        "m1-ratio",
        "m1-algebra",
        "m1-geometry",
        "m1-statistics",
        "m1-probability",
      ]));
  });

  it("contains only original structured content and local provenance", () => {
    const blocks = ESAT_MATHEMATICS_1_STARTER.questions.flatMap((question) => [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
    ]);
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(ESAT_MATHEMATICS_1_STARTER.questions.every((question) =>
      question.sourceQuestionPath === "content/esat/original-practice/mathematics-1-starter-v1.json" &&
      question.sourceAnswerPath === question.sourceQuestionPath,
    )).toBe(true);
  });
});
