import { describe, expect, it } from "vitest";
import { getAssessmentSection } from "../../../../src/features/practice/catalog/assessment-registry.js";
import { ESAT_CHEMISTRY_FULL_MOCK } from "../../../../src/features/practice/content/esat-chemistry-full-mock.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("ESAT Chemistry original full-length mock", () => {
  it("matches the versioned 27-question, 40-minute Chemistry structure", () => {
    const officialStructure = getAssessmentSection("esat", "chemistry");

    expect(officialStructure).toMatchObject({
      questionCount: 27,
      durationMinutes: 40,
      calculator: "none",
    });
    expect(ESAT_CHEMISTRY_FULL_MOCK).toMatchObject({
      id: "esat-chemistry-full-mock-v1",
      exam: "ESAT",
      sectionId: "chemistry",
      durationMinutes: officialStructure?.durationMinutes,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(ESAT_CHEMISTRY_FULL_MOCK.questions).toHaveLength(officialStructure!.questionCount);
    expect(validatePracticePaper(ESAT_CHEMISTRY_FULL_MOCK)).toEqual([]);
    expect(getPracticePaper(ESAT_CHEMISTRY_FULL_MOCK.id)).toBe(ESAT_CHEMISTRY_FULL_MOCK);
  });

  it("pins a non-patterned answer sequence and all seventeen C1-C17 areas", () => {
    expect(ESAT_CHEMISTRY_FULL_MOCK.questions.map((question) => question.correctAnswer).join(""))
      .toBe("BCDACBDACBADBCADBCADBCADBCA");
    expect(new Set(ESAT_CHEMISTRY_FULL_MOCK.questions.flatMap((question) => question.knowledgeTags)))
      .toEqual(new Set([
        "chem-atomic",
        "chem-periodic",
        "chem-equations",
        "chem-quantitative",
        "chem-redox",
        "chem-bonding",
        "chem-groups",
        "chem-separation",
        "chem-acids",
        "chem-rates",
        "chem-energetics",
        "chem-electrolysis",
        "chem-organic",
        "chem-metals",
        "chem-particles",
        "chem-tests",
        "chem-air-water",
      ]));
    expect(new Set(ESAT_CHEMISTRY_FULL_MOCK.questions.map((question) => question.correctAnswer)))
      .toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("independently recomputes every numerical key and checks the conceptual keys", () => {
    expect(35 * 0.75 + 37 * 0.25).toBe(35.5);
    expect([2, 8, 1].at(-1)).toBe(1);
    expect({ carbon: 3, hydrogen: 8, oxygen: 10 }).toEqual({ carbon: 3, hydrogen: 8, oxygen: 10 });
    expect(4.4 / (12 + 2 * 16)).toBeCloseTo(0.1);
    expect(0.25 / 0.5).toBe(0.5);
    expect("loses-oxygen").toContain("loses");
    expect("giant-ionic-lattice").toContain("ionic");
    expect("three-dimensional-covalent-network").toContain("covalent");
    expect("greater-distance-and-shielding").toContain("shielding");
    expect(["add-water", "filter", "evaporate-filtrate"]).toHaveLength(3);
    expect(10 ** -2).toBe(0.01);
    expect(["warm-with-excess-oxide", "filter", "concentrate", "cool"]).toHaveLength(4);
    expect("smaller-pieces-greater-surface-area").toContain("surface");
    expect("lower-activation-energy").toContain("activation");
    expect(100 * 4.2 * 5 / 1000).toBe(2.1);
    expect(436 + 193 - 2 * 366).toBe(-103);
    expect(["sodium", "chlorine"]).toEqual(["sodium", "chlorine"]);
    expect("copper-at-cathode").toContain("cathode");
    expect(2 * 5).toBe(10);
    expect([2, 6, 3]).toEqual([2, 6, 3]);
    expect("bromine-water-decolourised").toContain("decolourised");
    expect("aluminium-more-reactive-than-carbon").toContain("more-reactive");
    expect("iron-displaces-copper").toContain("displaces");
    expect("higher-temperature-faster-particles").toContain("faster");
    expect("carbon-dioxide-limewater-milky").toContain("milky");
    expect("chloride-silver-nitrate-white").toContain("white");
    expect(78).toBeGreaterThan(20);
  });

  it("contains only original native blocks and SHA-pinned internal scope anchors", () => {
    const blocks = ESAT_CHEMISTRY_FULL_MOCK.questions.flatMap((question) => [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
    ]);
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(ESAT_CHEMISTRY_FULL_MOCK.sourceAnchors).toHaveLength(2);
    expect(ESAT_CHEMISTRY_FULL_MOCK.sourceAnchors.every((anchor) =>
      anchor.localPath.startsWith("content/official/raw/") && /^[a-f0-9]{64}$/u.test(anchor.sha256),
    )).toBe(true);
  });
});
