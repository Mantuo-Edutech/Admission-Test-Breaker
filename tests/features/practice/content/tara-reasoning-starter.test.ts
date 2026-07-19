import { describe, expect, it } from "vitest";
import { TARA_REASONING_STARTER } from "../../../../src/features/practice/content/tara-reasoning-starter.js";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("TARA original reasoning starter diagnostic", () => {
  it("is a complete runnable 10-question, 20-minute structured paper", () => {
    expect(TARA_REASONING_STARTER).toMatchObject({
      id: "tara-reasoning-starter-v1",
      exam: "TARA",
      durationMinutes: 20,
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(TARA_REASONING_STARTER.questions).toHaveLength(10);
    expect(validatePracticePaper(TARA_REASONING_STARTER)).toEqual([]);
    expect(getPracticePaper(TARA_REASONING_STARTER.id)).toBe(TARA_REASONING_STARTER);
  });

  it("pins five Critical Thinking and five Problem Solving answers", () => {
    expect(TARA_REASONING_STARTER.questions.map((question) => question.correctAnswer).join(""))
      .toBe("DBCADBCADB");
    expect(TARA_REASONING_STARTER.questions.slice(0, 5).every((question) =>
      question.knowledgeTags.every((tag) => tag.startsWith("tara-critical-"))
    )).toBe(true);
    expect(TARA_REASONING_STARTER.questions.slice(5).every((question) =>
      question.knowledgeTags.every((tag) => tag.startsWith("tara-problem-"))
    )).toBe(true);
  });

  it("contains only original structured content and SHA-pinned local scope anchors", () => {
    const blocks = TARA_REASONING_STARTER.questions.flatMap((question) => [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
    ]);
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
    expect(TARA_REASONING_STARTER.sourceAnchors.map((source) => source.sha256)).toEqual([
      "d326e78305aefd999c42953de3024d403f27357ecbc0f3dd562134e8105822cd",
      "afcee1ff9dd35025000cd7c5a4cef804fa31fb3e8870d5748ec8d3ac2c45a6cb",
    ]);
  });
});
