import { describe, expect, it } from "vitest";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { TMUA_DIAGNOSTIC_V1 } from "../../../../src/features/practice/content/tmua-diagnostic-v1.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("TMUA original 30-minute starting diagnostic", () => {
  it("is a runnable eight-question structured paper with a public basic result", () => {
    expect(TMUA_DIAGNOSTIC_V1).toMatchObject({
      id: "tmua-diagnostic-v1",
      exam: "TMUA",
      durationMinutes: 30,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(TMUA_DIAGNOSTIC_V1.questions).toHaveLength(8);
    expect(validatePracticePaper(TMUA_DIAGNOSTIC_V1, { questionCount: 8 })).toEqual([]);
    expect(getPracticePaper(TMUA_DIAGNOSTIC_V1.id)).toBe(TMUA_DIAGNOSTIC_V1);
  });

  it("pins the independently checked answer key and eight distinct knowledge areas", () => {
    expect(TMUA_DIAGNOSTIC_V1.questions.map((question) => question.correctAnswer).join(""))
      .toBe("CCDCCBCD");
    expect(new Set(TMUA_DIAGNOSTIC_V1.questions.flatMap((question) => question.knowledgeTags)).size)
      .toBe(8);
  });

  it("contains only original structured content and two SHA-pinned official scope anchors", () => {
    const blocks = TMUA_DIAGNOSTIC_V1.questions.flatMap((question) => [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
    ]);
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(TMUA_DIAGNOSTIC_V1.sourceAnchors.map((source) => source.sha256)).toEqual([
      "2664e88733d54fba4956e681fce75b8b2c81724aac27d0e76610c5e233948f64",
      "12ed684ee2dfb9b53355d54018ba216b5cd32161e5f6c5c9ee5e96b93cbf8844",
    ]);
  });
});
