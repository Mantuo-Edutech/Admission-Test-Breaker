import { describe, expect, it } from "vitest";
import { LNAT_SECTION_A_STARTER } from "../../../../src/features/practice/content/lnat-section-a-starter.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("LNAT original Section A starter diagnostic", () => {
  it("is a complete runnable three-passage, 12-question structured paper", () => {
    expect(LNAT_SECTION_A_STARTER).toMatchObject({
      id: "lnat-section-a-starter-v1",
      exam: "LNAT",
      durationMinutes: 30,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(LNAT_SECTION_A_STARTER.passages).toHaveLength(3);
    expect(LNAT_SECTION_A_STARTER.questions).toHaveLength(12);
    expect(validatePracticePaper(LNAT_SECTION_A_STARTER)).toEqual([]);
    expect(getPracticePaper(LNAT_SECTION_A_STARTER.id)).toBe(LNAT_SECTION_A_STARTER);
  });

  it("pins four questions to every passage and fixes the reviewed answer sequence", () => {
    expect(LNAT_SECTION_A_STARTER.questions.map((question) => question.correctAnswer).join(""))
      .toBe("CBADCBDABCDA");
    for (const passage of LNAT_SECTION_A_STARTER.passages ?? []) {
      expect(LNAT_SECTION_A_STARTER.questions.filter((question) => question.passageId === passage.id))
        .toHaveLength(4);
    }
  });

  it("contains only original structured content and SHA-pinned local scope anchors", () => {
    const blocks = [
      ...(LNAT_SECTION_A_STARTER.passages ?? []).flatMap((passage) => passage.content),
      ...LNAT_SECTION_A_STARTER.questions.flatMap((question) => [
        ...question.prompt,
        ...question.options.flatMap((option) => option.content),
      ]),
    ];
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(LNAT_SECTION_A_STARTER.sourceAnchors.map((source) => source.sha256)).toEqual([
      "b876afae5e82ef0f43cb714c37ed26a08369b3d6714b40e1fca89288829ced08",
      "6e251cb2cf2eb0d803abe0747707b9f752ccae1d7334e414832bd56625f8f628",
    ]);
  });

  it("rejects missing and duplicate passage references", () => {
    const missing = structuredClone(LNAT_SECTION_A_STARTER);
    missing.questions[0]!.passageId = "missing-passage";
    expect(validatePracticePaper(missing).map((issue) => issue.code)).toContain("missing-passage");

    const duplicate = structuredClone(LNAT_SECTION_A_STARTER);
    duplicate.passages!.push(structuredClone(duplicate.passages![0]!));
    expect(validatePracticePaper(duplicate).map((issue) => issue.code)).toContain("duplicate-passage-id");
  });
});
