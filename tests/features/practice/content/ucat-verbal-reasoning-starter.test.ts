import { describe, expect, it } from "vitest";
import { UCAT_VERBAL_REASONING_STARTER } from "../../../../src/features/practice/content/ucat-verbal-reasoning-starter.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("UCAT original Verbal Reasoning starter", () => {
  it("is a complete runnable three-passage, 12-question, six-minute paper", () => {
    expect(UCAT_VERBAL_REASONING_STARTER).toMatchObject({
      id: "ucat-verbal-reasoning-starter-v1",
      exam: "UCAT",
      durationMinutes: 6,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(UCAT_VERBAL_REASONING_STARTER.passages).toHaveLength(3);
    expect(UCAT_VERBAL_REASONING_STARTER.questions).toHaveLength(12);
    expect(validatePracticePaper(UCAT_VERBAL_REASONING_STARTER)).toEqual([]);
    expect(getPracticePaper(UCAT_VERBAL_REASONING_STARTER.id)).toBe(UCAT_VERBAL_REASONING_STARTER);
  });

  it("pins four questions per passage and the reviewed answer sequence", () => {
    expect(UCAT_VERBAL_REASONING_STARTER.questions.map((question) => question.correctAnswer).join(""))
      .toBe("ABCDBACDABCD");
    for (const passage of UCAT_VERBAL_REASONING_STARTER.passages ?? []) {
      expect(UCAT_VERBAL_REASONING_STARTER.questions.filter((question) => question.passageId === passage.id))
        .toHaveLength(4);
    }
  });

  it("contains no official question blocks and pins both local scope anchors", () => {
    const blocks = [
      ...(UCAT_VERBAL_REASONING_STARTER.passages ?? []).flatMap((passage) => passage.content),
      ...UCAT_VERBAL_REASONING_STARTER.questions.flatMap((question) => [
        ...question.prompt,
        ...question.options.flatMap((option) => option.content),
      ]),
    ];
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(UCAT_VERBAL_REASONING_STARTER.sourceAnchors.map((source) => source.sha256)).toEqual([
      "d41aced66344051a8e81173ee2a093126dc3c20e213602cad55778b85e16b367",
      "136e3775e77f03fef4baab5bcb85a0affaba74d240981748c9cc1474cfdbf7b9",
    ]);
  });
});
