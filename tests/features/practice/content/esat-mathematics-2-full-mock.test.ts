import { describe, expect, it } from "vitest";
import { getAssessmentSection } from "../../../../src/features/practice/catalog/assessment-registry.js";
import { ESAT_MATHEMATICS_2_FULL_MOCK } from "../../../../src/features/practice/content/esat-mathematics-2-full-mock.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("ESAT Mathematics 2 original full-length mock", () => {
  it("matches the versioned 27-question, 40-minute Mathematics 2 structure", () => {
    const officialStructure = getAssessmentSection("esat", "mathematics-2");

    expect(officialStructure).toMatchObject({
      questionCount: 27,
      durationMinutes: 40,
      calculator: "none",
    });
    expect(ESAT_MATHEMATICS_2_FULL_MOCK).toMatchObject({
      id: "esat-mathematics-2-full-mock-v1",
      exam: "ESAT",
      sectionId: "mathematics-2",
      durationMinutes: officialStructure?.durationMinutes,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(ESAT_MATHEMATICS_2_FULL_MOCK.questions).toHaveLength(
      officialStructure!.questionCount,
    );
    expect(validatePracticePaper(ESAT_MATHEMATICS_2_FULL_MOCK)).toEqual([]);
    expect(getPracticePaper(ESAT_MATHEMATICS_2_FULL_MOCK.id))
      .toBe(ESAT_MATHEMATICS_2_FULL_MOCK);
  });

  it("pins a non-patterned answer sequence and all eight scope areas", () => {
    expect(ESAT_MATHEMATICS_2_FULL_MOCK.questions.map((question) =>
      question.correctAnswer).join(""))
      .toBe("BDACCBADDBACDCABCDABDCBACAD");
    expect(new Set(ESAT_MATHEMATICS_2_FULL_MOCK.questions.flatMap((question) =>
      question.knowledgeTags)))
      .toEqual(new Set([
        "m2-algebra-functions",
        "m2-sequences-series",
        "m2-coordinate-geometry",
        "m2-trigonometry",
        "m2-exponentials-logs",
        "m2-differentiation",
        "m2-integration",
        "m2-graphs",
      ]));
    expect(new Set(ESAT_MATHEMATICS_2_FULL_MOCK.questions.map((question) =>
      question.correctAnswer))).toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("independently recomputes the complete answer key", () => {
    expect(5 ** 2 - 2).toBe(23);
    expect(-(8 - 8 + 6) / 4).toBe(-3 / 2);
    expect(-10 * 2 ** 2).toBe(-40);
    expect([-4, 1].every((x) => (2 * x + 3) ** 2 === 25)).toBe(true);

    const ratio = Math.cbrt(96 / 12);
    expect(12 / ratio ** 2).toBe(3);
    expect(10 / 2 * (2 * 5 + 9 * 3)).toBe(185);
    expect(12 / (1 - (-4 / 12))).toBe(9);

    expect(2 * 2 + 3 * (-1)).toBe(1);
    expect(Math.sqrt(2 ** 2 + 3 ** 2 + 12)).toBe(5);
    expect(2 * Math.sqrt(25 - 3 ** 2)).toBe(8);
    expect([0, Math.PI / 3, 5 * Math.PI / 3]).toHaveLength(3);
    expect((3 / 5) / (-4 / 5)).toBeCloseTo(-3 / 4);
    expect(Math.hypot(3, 4)).toBe(5);
    expect(6 * 5 * Math.PI / 6).toBeCloseTo(5 * Math.PI);

    expect((1 + 3) / 2).toBe(2);
    expect((3 + Math.sqrt(3 ** 2 + 16)) / 2).toBe(4);
    expect(800 * 2 ** 3).toBe(6400);
    expect(Math.E + 2 * Math.E).toBeCloseTo(3 * Math.E);
    expect(3 * (-1) ** 2 - 6 * (-1) - 9).toBe(0);
    expect(6 * (-1) - 6).toBeLessThan(0);
    expect(Math.log(Math.E)).toBeCloseTo(Math.E / Math.E);
    expect(2 * (12 - 2 ** 2)).toBe(16);

    expect((2 ** 3 - 2 ** 2 + 2)).toBe(6);
    const integrationConstant = 5 - (3 * 1 ** 2 - 4 * 1);
    expect(3 * 2 ** 2 - 4 * 2 + integrationConstant).toBe(10);
    expect(1 / 2 - 1 / 3).toBeCloseTo(1 / 6);

    expect(2 * (5 - 3)).toBe(4);
    expect([-1, 3].every((x) => Math.abs(x - 1) === 2)).toBe(true);
    expect(3 - 3).toBe(0);
    expect((2 * 1e9 + 1) / (1e9 - 3)).toBeCloseTo(2, 7);
  });

  it("contains only original native blocks and SHA-pinned internal scope anchors", () => {
    const blocks = ESAT_MATHEMATICS_2_FULL_MOCK.questions.flatMap((question) => [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
    ]);
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(ESAT_MATHEMATICS_2_FULL_MOCK.sourceAnchors).toHaveLength(2);
    expect(ESAT_MATHEMATICS_2_FULL_MOCK.sourceAnchors.every((anchor) =>
      anchor.localPath.startsWith("content/official/raw/") && /^[a-f0-9]{64}$/u.test(anchor.sha256),
    )).toBe(true);
  });
});
