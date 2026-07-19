import { describe, expect, it } from "vitest";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { UCAT_QUANTITATIVE_REASONING_STARTER } from "../../../../src/features/practice/content/ucat-quantitative-reasoning-starter.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("UCAT original Quantitative Reasoning starter", () => {
  it("is a complete runnable four-dataset, ten-question paper with a basic calculator", () => {
    expect(UCAT_QUANTITATIVE_REASONING_STARTER).toMatchObject({
      id: "ucat-quantitative-reasoning-starter-v1",
      exam: "UCAT",
      durationMinutes: 8,
      calculator: "basic",
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(UCAT_QUANTITATIVE_REASONING_STARTER.passages).toHaveLength(4);
    expect(UCAT_QUANTITATIVE_REASONING_STARTER.questions).toHaveLength(10);
    expect(UCAT_QUANTITATIVE_REASONING_STARTER.questions.map((question) => question.correctAnswer).join(""))
      .toBe("BCBDCBCACB");
    expect(validatePracticePaper(UCAT_QUANTITATIVE_REASONING_STARTER)).toEqual([]);
    expect(getPracticePaper(UCAT_QUANTITATIVE_REASONING_STARTER.id)).toBe(UCAT_QUANTITATIVE_REASONING_STARTER);
  });

  it("uses only rectangular native tables and links every question to one data set", () => {
    const passages = UCAT_QUANTITATIVE_REASONING_STARTER.passages ?? [];
    const tables = passages.flatMap((passage) => passage.content.filter((block) => block.kind === "table"));
    expect(tables).toHaveLength(4);
    for (const table of tables) {
      expect(table.rows.every((row) => row.length === table.headers.length)).toBe(true);
    }
    expect(UCAT_QUANTITATIVE_REASONING_STARTER.questions.every((question) =>
      passages.some((passage) => passage.id === question.passageId)
    )).toBe(true);
  });

  it("pins local format and calculator scope snapshots without exposing them as question blocks", () => {
    expect(UCAT_QUANTITATIVE_REASONING_STARTER.sourceAnchors.map((source) => source.sha256)).toEqual([
      "9aa4a93bddcc62bf53c6196f2b38ac40240a1f781154590c772c68f179d52dbf",
      "a659bedc40b1a603cb755e75121a19a633889d2aab62b66d62378e804f7b8c7c",
    ]);
    const blocks = [
      ...(UCAT_QUANTITATIVE_REASONING_STARTER.passages ?? []).flatMap((passage) => passage.content),
      ...UCAT_QUANTITATIVE_REASONING_STARTER.questions.flatMap((question) => question.prompt),
    ];
    expect(blocks.every((block) => block.kind !== "source-pdf")).toBe(true);
  });

  it("rejects a ragged or empty data table", () => {
    const ragged = structuredClone(UCAT_QUANTITATIVE_REASONING_STARTER);
    const table = ragged.passages![0]!.content.find((block) => block.kind === "table")!;
    table.rows[0]!.pop();
    expect(validatePracticePaper(ragged).map((issue) => issue.code)).toContain("invalid-data-table");
  });
});
