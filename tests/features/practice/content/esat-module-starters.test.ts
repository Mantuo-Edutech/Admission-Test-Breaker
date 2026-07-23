import { describe, expect, it } from "vitest";
import { ESAT_STARTERS, getEsatStarter } from "../../../../src/features/practice/content/esat-starters.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

const answerSequences: Readonly<Record<string, string>> = {
  "esat-mathematics-1-starter-v1": "BCCBBCDBBC",
  "esat-mathematics-2-starter-v1": "BACCBCCBDC",
  "esat-physics-starter-v1": "BBBBBCCCBC",
  "esat-chemistry-starter-v1": "ADBABCBCCA",
  "esat-biology-starter-v1": "BBBAABBCAB",
};

describe("ESAT five-module original starter diagnostics", () => {
  it("registers five distinct 10-question native papers", () => {
    expect(ESAT_STARTERS).toHaveLength(5);
    expect(new Set(ESAT_STARTERS.map((paper) => paper.id))).toHaveProperty("size", 5);
    expect(ESAT_STARTERS.reduce((total, paper) => total + paper.questions.length, 0)).toBe(50);

    for (const paper of ESAT_STARTERS) {
      expect(paper).toMatchObject({
        exam: "ESAT",
        durationMinutes: 20,
        deliveryMode: "structured",
        publicationStatus: "teaching-preview",
        authorship: "满托教研原创",
      });
      expect(validatePracticePaper(paper)).toEqual([]);
      expect(getEsatStarter(paper.id)).toBe(paper);
      expect(getPracticePaper(paper.id)).toBe(paper);
    }
  });

  it("pins all 50 reviewed answers", () => {
    for (const paper of ESAT_STARTERS) {
      expect(paper.questions.map((question) => question.correctAnswer).join(""))
        .toBe(answerSequences[paper.id]);
    }
  });

  it("keeps every starter original, structured and locally provenance-pinned", () => {
    for (const paper of ESAT_STARTERS) {
      const blocks = paper.questions.flatMap((question) => [
        ...question.prompt,
        ...question.options.flatMap((option) => option.content),
      ]);
      expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
      expect(paper.sourceAnchors).toHaveLength(2);
      expect(paper.sourceAnchors.every((source) =>
        source.localPath.startsWith("content/official/raw/") && /^[a-f0-9]{64}$/u.test(source.sha256)
      )).toBe(true);
    }
  });
});
