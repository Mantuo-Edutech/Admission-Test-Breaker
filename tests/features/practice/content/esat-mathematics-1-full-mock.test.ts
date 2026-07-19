import { describe, expect, it } from "vitest";
import { getAssessmentSection } from "../../../../src/features/practice/catalog/assessment-registry.js";
import { ESAT_MATHEMATICS_1_FULL_MOCK } from "../../../../src/features/practice/content/esat-mathematics-1-full-mock.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("ESAT Mathematics 1 original full-length mock", () => {
  it("matches the versioned 27-question, 40-minute Mathematics 1 structure", () => {
    const officialStructure = getAssessmentSection("esat", "mathematics-1");

    expect(officialStructure).toMatchObject({
      questionCount: 27,
      durationMinutes: 40,
      calculator: "none",
    });
    expect(ESAT_MATHEMATICS_1_FULL_MOCK).toMatchObject({
      id: "esat-mathematics-1-full-mock-v1",
      exam: "ESAT",
      sectionId: "mathematics-1",
      durationMinutes: officialStructure?.durationMinutes,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(ESAT_MATHEMATICS_1_FULL_MOCK.questions).toHaveLength(
      officialStructure!.questionCount,
    );
    expect(validatePracticePaper(ESAT_MATHEMATICS_1_FULL_MOCK)).toEqual([]);
    expect(getPracticePaper(ESAT_MATHEMATICS_1_FULL_MOCK.id))
      .toBe(ESAT_MATHEMATICS_1_FULL_MOCK);
  });

  it("pins a non-patterned answer sequence and all seven scope areas", () => {
    expect(ESAT_MATHEMATICS_1_FULL_MOCK.questions.map((question) =>
      question.correctAnswer).join(""))
      .toBe("BCDABDCBCBCDBCABADBCABCADBC");
    expect(new Set(ESAT_MATHEMATICS_1_FULL_MOCK.questions.flatMap((question) =>
      question.knowledgeTags)))
      .toEqual(new Set([
        "m1-units",
        "m1-number",
        "m1-ratio",
        "m1-algebra",
        "m1-geometry",
        "m1-statistics",
        "m1-probability",
      ]));
    expect(new Set(ESAT_MATHEMATICS_1_FULL_MOCK.questions.map((question) =>
      question.correctAnswer))).toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("independently recomputes every numerical answer used by the key", () => {
    const values = [
      1.8 * 25 / 1000,
      2.4 / (300 / 1_000_000),
      (3 + 1) * (2 + 1) * (1 + 1),
      25 / 90,
      Math.sqrt(5) + 1,
      8.25 * 3.45,
      (8 / 3) * 6 ** 2 / 4,
      204 / (0.85 * 1.2),
      2 * (7 / 3) ** 2,
      3,
      0,
      20 / 2 * (2 + 78),
      2 - (-3) + 1,
      Math.PI * (8 ** 2 + 6 ** 2),
      3 ** 3 / 4 ** 3,
      Math.sqrt(7 ** 2 + 9 ** 2 - 2 * 7 * 9 * 0.5),
      1 / 3,
      1 + (2 / 3) * (7 - 1),
      (12 * 14 + 8 * 20) / 20,
      2 * ((8 + 10) / 2) - 1,
      (5 * 4 + 15 * 7 + 25 * 9 + 35 * 5) / 25,
      9 / 36,
      0.48 / (0.48 + 0.2),
      3 * (2 / 3) ** 2 * (1 / 3),
      3 * 3 * 2,
      0.5 * 5 * 12,
      6,
    ];

    expect(values[0]).toBeCloseTo(0.045);
    expect(values[1]).toBe(8000);
    expect(values[2]).toBe(24);
    expect(values[3]).toBeCloseTo(5 / 18);
    expect(values[4]).toBeCloseTo(Math.sqrt(5) + 1);
    expect(values[5]).toBeCloseTo(28.4625);
    const expected = [
      24,
      200,
      98 / 9,
      3,
      0,
      800,
      6,
      100 * Math.PI,
      27 / 64,
      Math.sqrt(67),
      1 / 3,
      5,
      16.4,
      17,
      21,
      1 / 4,
      12 / 17,
      4 / 9,
      18,
      30,
      6,
    ];
    expected.forEach((value, index) => {
      expect(values[index + 6]).toBeCloseTo(value);
    });
    const f = (x: number) => (x - 2) / (x + 1);
    for (const x of [-4, 0, 2, 3]) {
      expect(f(f(x))).toBeCloseTo((-x - 4) / (2 * x - 1));
    }
  });

  it("contains only original native blocks and SHA-pinned internal scope anchors", () => {
    const blocks = ESAT_MATHEMATICS_1_FULL_MOCK.questions.flatMap((question) => [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
    ]);
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(ESAT_MATHEMATICS_1_FULL_MOCK.sourceAnchors).toHaveLength(2);
    expect(ESAT_MATHEMATICS_1_FULL_MOCK.sourceAnchors.every((anchor) =>
      anchor.localPath.startsWith("content/official/raw/") && /^[a-f0-9]{64}$/u.test(anchor.sha256),
    )).toBe(true);
  });
});
