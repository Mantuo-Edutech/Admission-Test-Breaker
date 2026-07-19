import { describe, expect, it } from "vitest";
import { LNAT_SECTION_A_FULL_MOCK } from "../../../../src/features/practice/content/lnat-section-a-full-mock.js";
import {
  getPracticePaper,
  loadPracticePaper,
} from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("LNAT original Section A complete-structure mock", () => {
  it("delivers twelve passages, 42 four-option questions and the current 95-minute structure", () => {
    expect(LNAT_SECTION_A_FULL_MOCK).toMatchObject({
      id: "lnat-section-a-full-mock-v1",
      exam: "LNAT",
      durationMinutes: 95,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(LNAT_SECTION_A_FULL_MOCK.passages).toHaveLength(12);
    expect(LNAT_SECTION_A_FULL_MOCK.questions).toHaveLength(42);
    expect(LNAT_SECTION_A_FULL_MOCK.questions.every((question) => question.options.length === 4)).toBe(true);
    expect(validatePracticePaper(LNAT_SECTION_A_FULL_MOCK)).toEqual([]);
  });

  it("uses six four-question and six three-question passage groups", () => {
    const counts = (LNAT_SECTION_A_FULL_MOCK.passages ?? []).map((passage) =>
      LNAT_SECTION_A_FULL_MOCK.questions.filter((question) => question.passageId === passage.id).length
    );
    expect(counts.filter((count) => count === 4)).toHaveLength(6);
    expect(counts.filter((count) => count === 3)).toHaveLength(6);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(42);
  });

  it("pins the independently checked answer sequence and all declared reasoning domains", () => {
    expect(LNAT_SECTION_A_FULL_MOCK.questions.map((question) => question.correctAnswer).join(""))
      .toBe("BCADADBCDABCABACBDBACBCBCDABCABDBACDABCDBC");
    expect(new Set(LNAT_SECTION_A_FULL_MOCK.questions.flatMap((question) => question.knowledgeTags)))
      .toEqual(new Set([
        "lnat-main-conclusion",
        "lnat-argument-role",
        "lnat-context-meaning",
        "lnat-evidence-evaluation",
        "lnat-evidence-limit",
        "lnat-inference",
        "lnat-principle",
        "lnat-qualification",
        "lnat-recommendation",
        "lnat-strengthen",
        "lnat-analogy",
      ]));
  });

  it("contains no official item blocks and retains SHA-pinned local scope anchors", () => {
    const blocks = [
      ...(LNAT_SECTION_A_FULL_MOCK.passages ?? []).flatMap((passage) => passage.content),
      ...LNAT_SECTION_A_FULL_MOCK.questions.flatMap((question) => [
        ...question.prompt,
        ...question.options.flatMap((option) => option.content),
      ]),
    ];
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(LNAT_SECTION_A_FULL_MOCK.sourceAnchors.map((source) => source.sha256)).toEqual([
      "b876afae5e82ef0f43cb714c37ed26a08369b3d6714b40e1fca89288829ced08",
      "6e251cb2cf2eb0d803abe0747707b9f752ccae1d7334e414832bd56625f8f628",
    ]);
    expect(LNAT_SECTION_A_FULL_MOCK.rightsNotice).toMatch(/不复制/u);
    expect(LNAT_SECTION_A_FULL_MOCK.rightsNotice).toMatch(/原始正确数/u);
  });

  it("keeps the large dataset out of the default registry and loads it on demand", async () => {
    expect(getPracticePaper(LNAT_SECTION_A_FULL_MOCK.id)).toBeNull();
    await expect(loadPracticePaper(LNAT_SECTION_A_FULL_MOCK.id)).resolves.toBe(LNAT_SECTION_A_FULL_MOCK);
    expect(getPracticePaper(LNAT_SECTION_A_FULL_MOCK.id)).toBe(LNAT_SECTION_A_FULL_MOCK);
  });
});
