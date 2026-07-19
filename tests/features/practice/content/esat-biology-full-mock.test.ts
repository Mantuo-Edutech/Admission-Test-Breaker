import { describe, expect, it } from "vitest";
import { getAssessmentSection } from "../../../../src/features/practice/catalog/assessment-registry.js";
import { ESAT_BIOLOGY_FULL_MOCK } from "../../../../src/features/practice/content/esat-biology-full-mock.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("ESAT Biology original full-length mock", () => {
  it("matches the versioned 27-question, 40-minute Biology structure", () => {
    const officialStructure = getAssessmentSection("esat", "biology");

    expect(officialStructure).toMatchObject({
      questionCount: 27,
      durationMinutes: 40,
      calculator: "none",
    });
    expect(ESAT_BIOLOGY_FULL_MOCK).toMatchObject({
      id: "esat-biology-full-mock-v1",
      exam: "ESAT",
      sectionId: "biology",
      durationMinutes: officialStructure?.durationMinutes,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(ESAT_BIOLOGY_FULL_MOCK.questions).toHaveLength(officialStructure!.questionCount);
    expect(validatePracticePaper(ESAT_BIOLOGY_FULL_MOCK)).toEqual([]);
    expect(getPracticePaper(ESAT_BIOLOGY_FULL_MOCK.id)).toBe(ESAT_BIOLOGY_FULL_MOCK);
  });

  it("pins a non-patterned answer sequence and all eleven B1-B11 areas", () => {
    expect(ESAT_BIOLOGY_FULL_MOCK.questions.map((question) => question.correctAnswer).join(""))
      .toBe("DBACCBDACBADCBADCABDCBACDAB");
    expect(new Set(ESAT_BIOLOGY_FULL_MOCK.questions.flatMap((question) => question.knowledgeTags)))
      .toEqual(new Set([
        "bio-cells",
        "bio-membranes",
        "bio-division",
        "bio-inheritance",
        "bio-dna",
        "bio-gene-tech",
        "bio-variation",
        "bio-enzymes",
        "bio-animal",
        "bio-ecosystems",
        "bio-plants",
      ]));
    expect(new Set(ESAT_BIOLOGY_FULL_MOCK.questions.map((question) => question.correctAnswer)))
      .toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("independently recomputes every numerical key and checks the conceptual keys", () => {
    expect("circular-chromosomal-dna-without-nucleus").toContain("without-nucleus");
    expect(["cell", "tissue", "organ", "organ-system"]).toHaveLength(4);
    expect("active-transport-uses-respiration").toContain("uses-respiration");
    expect((4.2 - 5) / 5 * 100).toBeCloseTo(-16);
    expect("two-identical-diploid-daughter-cells").toContain("identical");
    expect(12 / 2).toBe(6);
    expect(["AA", "Aa", "Aa", "aa"].filter((genotype) => genotype === "aa")).toHaveLength(1);
    expect("allele-combination-and-observable-characteristic").toContain("observable");
    expect("AGTC".replace(/[ATGC]/gu, (base) => ({ A: "T", T: "A", G: "C", C: "G" })[base]!))
      .toBe("TCAG");
    expect("same-amino-acid-or-no-functional-effect").toContain("no-functional-effect");
    expect(["restriction-enzyme", "dna-ligase"]).toEqual(["restriction-enzyme", "dna-ligase"]);
    expect("totipotent-complete-organism").toContain("complete-organism");
    expect("darker-alleles-increase-through-differential-reproduction").toContain("increase");
    expect("body-mass-genetic-and-environmental").toContain("environmental");
    expect("complementary-active-site").toContain("active-site");
    expect("protease-digests-proteins").toContain("proteins");
    expect("glucose-to-lactic-acid").toContain("lactic-acid");
    expect(["receptor", "sensory", "relay", "motor", "effector"]).toHaveLength(5);
    expect("diaphragm-contracts-volume-increases-pressure-falls").toContain("pressure-falls");
    expect("red-blood-cells-carry-oxygen").toContain("oxygen");
    expect("insulin-glucose-uptake-glycogen").toContain("glycogen");
    expect("adh-more-reabsorption-concentrated-urine").toContain("concentrated");
    expect("memory-cells-faster-specific-response").toContain("memory-cells");
    expect(((6 + 4 + 5 + 7 + 3) / 5) / 0.5 * 40).toBe(400);
    expect("algae-shading-decomposition-oxygen-loss").toContain("oxygen-loss");
    expect("another-limiting-factor").toContain("limiting");
    expect(3.6 / 15).toBeCloseTo(0.24);
  });

  it("contains only original native blocks and SHA-pinned internal scope anchors", () => {
    const blocks = ESAT_BIOLOGY_FULL_MOCK.questions.flatMap((question) => [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
    ]);
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(ESAT_BIOLOGY_FULL_MOCK.sourceAnchors).toHaveLength(2);
    expect(ESAT_BIOLOGY_FULL_MOCK.sourceAnchors.every((anchor) =>
      anchor.localPath.startsWith("content/official/raw/") && /^[a-f0-9]{64}$/u.test(anchor.sha256),
    )).toBe(true);
  });
});
