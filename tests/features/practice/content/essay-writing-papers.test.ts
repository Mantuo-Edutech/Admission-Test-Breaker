import { describe, expect, it } from "vitest";
import { LNAT_SECTION_B_WRITING } from "../../../../src/features/practice/content/lnat-section-b-writing.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { TARA_WRITING_TASK } from "../../../../src/features/practice/content/tara-writing-task.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";
import {
  countEssayWords,
  essayResponseIsComplete,
  parseEssayResponse,
  serializeEssayResponse,
} from "../../../../src/features/practice/domain/essay-response.js";

describe("TARA and LNAT native essay practice papers", () => {
  it.each([
    [TARA_WRITING_TASK, "tara-writing-task-v1", "TARA", "writing-task"],
    [LNAT_SECTION_B_WRITING, "lnat-section-b-writing-v1", "LNAT", "section-b"],
  ] as const)("loads %s as a complete 40-minute three-prompt paper", (paper, id, exam, sectionId) => {
    expect(paper).toMatchObject({
      id,
      exam,
      sectionId,
      durationMinutes: 40,
      responseMode: "essay",
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(paper.essayTask?.prompts).toHaveLength(3);
    expect(paper.essayTask?.maxWords).toBe(750);
    expect(paper.questions).toHaveLength(1);
    expect(paper.questions[0]).toMatchObject({ options: [], correctAnswer: "" });
    expect(validatePracticePaper(paper)).toEqual([]);
    expect(getPracticePaper(id)).toBe(paper);
  });

  it("pins every paper to two local, SHA-verified official scope anchors", () => {
    expect(TARA_WRITING_TASK.sourceAnchors.map((source) => source.sha256)).toEqual([
      "d326e78305aefd999c42953de3024d403f27357ecbc0f3dd562134e8105822cd",
      "afcee1ff9dd35025000cd7c5a4cef804fa31fb3e8870d5748ec8d3ac2c45a6cb",
    ]);
    expect(LNAT_SECTION_B_WRITING.sourceAnchors.map((source) => source.sha256)).toEqual([
      "b876afae5e82ef0f43cb714c37ed26a08369b3d6714b40e1fca89288829ced08",
      "bc27b9799f47bf6234a20b1996d5ae0ae1003e8dd391fe15586c249a014f1f2c",
    ]);
    expect(LNAT_SECTION_B_WRITING.essayTask?.recommendedWords).toEqual({ min: 500, max: 600 });
  });

  it("rejects malformed prompt sets, choice answers and invalid recommended ranges", () => {
    const duplicatePrompt = structuredClone(TARA_WRITING_TASK);
    duplicatePrompt.essayTask!.prompts[1]!.id = duplicatePrompt.essayTask!.prompts[0]!.id;
    expect(validatePracticePaper(duplicatePrompt).map((issue) => issue.code)).toContain("invalid-essay-task");

    const answerKey = structuredClone(TARA_WRITING_TASK);
    answerKey.questions[0]!.correctAnswer = "A";
    expect(validatePracticePaper(answerKey).map((issue) => issue.code)).toContain("essay-answer-key");

    const invalidRange = structuredClone(LNAT_SECTION_B_WRITING);
    invalidRange.essayTask!.recommendedWords = { min: 800, max: 900 };
    expect(validatePracticePaper(invalidRange).map((issue) => issue.code)).toContain("invalid-essay-task");
  });

  it("serializes private drafts and counts English, numbers and Chinese deterministically", () => {
    const encoded = serializeEssayResponse({
      promptId: "civil-disobedience",
      text: "A well-tested argument has 2 reasons. 论证清楚。",
    });
    expect(parseEssayResponse(encoded)).toEqual({
      promptId: "civil-disobedience",
      text: "A well-tested argument has 2 reasons. 论证清楚。",
    });
    expect(countEssayWords(parseEssayResponse(encoded).text)).toBe(10);
    expect(essayResponseIsComplete(encoded)).toBe(true);
    expect(essayResponseIsComplete(serializeEssayResponse({ promptId: "civil-disobedience", text: "" }))).toBe(false);
    expect(parseEssayResponse("not-json")).toEqual({ promptId: "", text: "" });
  });
});
