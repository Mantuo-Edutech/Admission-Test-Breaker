import { describe, expect, it } from "vitest";
import { getAssessmentSection } from "../../../../src/features/practice/catalog/assessment-registry.js";
import { ESAT_PHYSICS_FULL_MOCK } from "../../../../src/features/practice/content/esat-physics-full-mock.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("ESAT Physics original full-length mock", () => {
  it("matches the versioned 27-question, 40-minute Physics structure", () => {
    const officialStructure = getAssessmentSection("esat", "physics");

    expect(officialStructure).toMatchObject({
      questionCount: 27,
      durationMinutes: 40,
      calculator: "none",
    });
    expect(ESAT_PHYSICS_FULL_MOCK).toMatchObject({
      id: "esat-physics-full-mock-v1",
      exam: "ESAT",
      sectionId: "physics",
      durationMinutes: officialStructure?.durationMinutes,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(ESAT_PHYSICS_FULL_MOCK.questions).toHaveLength(officialStructure!.questionCount);
    expect(validatePracticePaper(ESAT_PHYSICS_FULL_MOCK)).toEqual([]);
    expect(getPracticePaper(ESAT_PHYSICS_FULL_MOCK.id)).toBe(ESAT_PHYSICS_FULL_MOCK);
  });

  it("pins a non-patterned answer sequence and all seven P1-P7 areas", () => {
    expect(ESAT_PHYSICS_FULL_MOCK.questions.map((question) => question.correctAnswer).join(""))
      .toBe("CBADBDACCADBACDBCADBCADBCAB");
    expect(new Set(ESAT_PHYSICS_FULL_MOCK.questions.flatMap((question) => question.knowledgeTags)))
      .toEqual(new Set([
        "physics-electricity",
        "physics-magnetism",
        "physics-mechanics",
        "physics-thermal",
        "physics-matter",
        "physics-waves",
        "physics-radioactivity",
      ]));
    expect(new Set(ESAT_PHYSICS_FULL_MOCK.questions.map((question) => question.correctAnswer)))
      .toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("independently recomputes every numerical answer and checks the conceptual key", () => {
    expect(240 / (2 * 60)).toBe(2);
    expect((24 / (4 + 8)) * 8).toBe(16);
    expect(12 * 3 * 50).toBe(1800);
    expect(18 * 3 / (6 + 3)).toBe(6);
    expect("loses-electrons").toMatch(/loses/u);

    expect(120 * 230 / 46).toBe(600);
    expect(0.5 * 3 * 0.4).toBeCloseTo(0.6);
    expect("strong-fast").toMatch(/fast/u);

    expect(0.5 * 3 * 4 ** 2).toBe(24);
    expect(5 * 2.4).toBe(12);
    expect(60 * 9.8).toBe(588);
    expect(Math.abs(0.5 * (-2 - 8))).toBe(5);
    expect(150 * 20).toBe(3000);
    expect(0.5 * 1200 * 15 ** 2).toBe(135000);
    expect(200 * 0.3 / 0.5).toBe(120);

    expect(0.25 * 900 * 40).toBe(9000);
    expect(0.15 * 334000).toBe(50100);
    expect(["copper", "glass", "wood", "polystyrene"].indexOf("copper")).toBe(0);

    expect(540 / 200).toBe(2.7);
    expect(1000 * 10 * 3).toBe(30000);
    expect(100 * 360 / 300).toBe(120);

    expect(80 * 1.5).toBe(120);
    expect("frequency-unchanged").toContain("unchanged");
    expect(340 * 0.8 / 2).toBe(136);
    expect("gap-similar-to-wavelength").toContain("similar");

    expect(640 / 2 ** (12 / 4)).toBe(80);
    expect(31 - 15).toBe(16);
  });

  it("contains only original native blocks and SHA-pinned internal scope anchors", () => {
    const blocks = ESAT_PHYSICS_FULL_MOCK.questions.flatMap((question) => [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
    ]);
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(ESAT_PHYSICS_FULL_MOCK.sourceAnchors).toHaveLength(2);
    expect(ESAT_PHYSICS_FULL_MOCK.sourceAnchors.every((anchor) =>
      anchor.localPath.startsWith("content/official/raw/") && /^[a-f0-9]{64}$/u.test(anchor.sha256),
    )).toBe(true);
  });
});
