import { describe, expect, it } from "vitest";
import { UCAT_VERBAL_REASONING_FULL_MOCK } from "../../../../src/features/practice/content/ucat-verbal-reasoning-full-mock.js";
import { getPracticePaper, loadPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("UCAT original Verbal Reasoning full mock", () => {
  it("delivers the current 11-passage, 44-question, 22-minute structure", () => {
    expect(UCAT_VERBAL_REASONING_FULL_MOCK).toMatchObject({
      id: "ucat-verbal-reasoning-full-mock-v1",
      exam: "UCAT",
      durationMinutes: 22,
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(UCAT_VERBAL_REASONING_FULL_MOCK.passages).toHaveLength(11);
    expect(UCAT_VERBAL_REASONING_FULL_MOCK.questions).toHaveLength(44);
    expect(validatePracticePaper(UCAT_VERBAL_REASONING_FULL_MOCK)).toEqual([]);
    for (const passage of UCAT_VERBAL_REASONING_FULL_MOCK.passages ?? []) {
      expect(UCAT_VERBAL_REASONING_FULL_MOCK.questions.filter((question) => question.passageId === passage.id))
        .toHaveLength(4);
    }
  });

  it("uses three TFCT items plus one four-option conclusion item per passage", () => {
    for (const [index, question] of UCAT_VERBAL_REASONING_FULL_MOCK.questions.entries()) {
      expect(question.options).toHaveLength(index % 4 === 3 ? 4 : 3);
      if (index % 4 !== 3) {
        expect(question.options.map((option) => option.content[0])).toEqual([
          { kind: "paragraph", runs: [{ kind: "text", value: "True" }] },
          { kind: "paragraph", runs: [{ kind: "text", value: "False" }] },
          { kind: "paragraph", runs: [{ kind: "text", value: "Can't Tell" }] },
        ]);
      }
    }
  });

  it("pins the checked answer sequence and all twelve VR evidence domains", () => {
    expect(UCAT_VERBAL_REASONING_FULL_MOCK.questions.map((question) => question.correctAnswer).join(""))
      .toBe("ABCCBACBBACDBACCBACBABCDABCABACBABCCABCBBACD");
    expect(new Set(UCAT_VERBAL_REASONING_FULL_MOCK.questions.flatMap((question) => question.knowledgeTags)).size)
      .toBe(12);
  });

  it("contains only original structured content and loads on demand", async () => {
    const blocks = [
      ...(UCAT_VERBAL_REASONING_FULL_MOCK.passages ?? []).flatMap((passage) => passage.content),
      ...UCAT_VERBAL_REASONING_FULL_MOCK.questions.flatMap((question) => [
        ...question.prompt,
        ...question.options.flatMap((option) => option.content),
      ]),
    ];
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(getPracticePaper(UCAT_VERBAL_REASONING_FULL_MOCK.id)).toBeNull();
    await expect(loadPracticePaper(UCAT_VERBAL_REASONING_FULL_MOCK.id))
      .resolves.toBe(UCAT_VERBAL_REASONING_FULL_MOCK);
  });
});
