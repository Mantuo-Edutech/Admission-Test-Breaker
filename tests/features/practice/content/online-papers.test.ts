import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getTmuaPracticePaper,
  TMUA_ONLINE_PAPER_MANIFEST,
  TMUA_ONLINE_PAPERS,
} from "../../../../src/features/practice/content/tmua-online-registry.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("complete TMUA online paper registry", () => {
  it("exposes all 18 papers and all 360 answerable questions", () => {
    expect(TMUA_ONLINE_PAPER_MANIFEST).toMatchObject({
      exam: "TMUA",
      paperCount: 18,
      questionCount: 360,
    });
    expect(TMUA_ONLINE_PAPERS).toHaveLength(18);
    expect(new Set(TMUA_ONLINE_PAPERS.map((paper) => paper.id)).size).toBe(18);

    let totalQuestions = 0;
    for (const record of TMUA_ONLINE_PAPERS) {
      expect(record.answers).toHaveLength(20);
      expect(record.questionPages).toHaveLength(20);
      expect(record.answers.every((answer) => /^[A-H]$/u.test(answer))).toBe(true);

      const paper = getTmuaPracticePaper(record.id);
      expect(paper).not.toBeNull();
      expect(paper?.questions).toHaveLength(20);
      expect(paper?.questions.map((question) => question.correctAnswer)).toEqual(record.answers);
      expect(validatePracticePaper(paper!)).toEqual([]);
      totalQuestions += paper?.questions.length ?? 0;
    }
    expect(totalQuestions).toBe(360);
  });

  it("keeps all 18 papers in native structured delivery", () => {
    expect(TMUA_ONLINE_PAPERS.every((record) => record.deliveryMode === "structured")).toBe(true);
    expect(TMUA_ONLINE_PAPERS.every((record) => record.publicDocumentPath === null)).toBe(true);

    for (const record of TMUA_ONLINE_PAPERS) {
      const paper = getTmuaPracticePaper(record.id);
      expect(paper?.deliveryMode).toBe("structured");
      expect(
        paper?.questions.flatMap((question) => question.prompt).every((block) => block.kind !== "source-pdf"),
      ).toBe(true);
      expect(paper?.questions.map((question) => question.sourcePage)).toEqual(record.questionPages);
    }
  });

  it("does not expose complete source PDFs for any structured paper", async () => {
    for (const record of TMUA_ONLINE_PAPERS) {
      await expect(
        readFile(resolve("public/papers/tmua", `${record.id}.pdf`)),
      ).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it("pins the visually audited Specimen Paper 1 transcription to the source PDF", () => {
    const paper = getTmuaPracticePaper("tmua-specimen-p1");
    expect(paper).not.toBeNull();
    const serialized = paper!.questions.map((question) =>
      JSON.stringify(question).replaceAll("\\\\", "\\"),
    );

    expect(serialized[2]).toContain("\\frac1{20}");
    expect(serialized[2]).toContain("\\frac{41}6");
    expect(paper!.questions[2]!.options.map((option) => option.label)).toEqual(["A", "B", "C", "D", "E"]);
    expect(serialized[4]).toContain("10^{-y}-1");
    expect(serialized[6]).toContain("(n-1)^3");
    expect(serialized[7]).toContain("\\log_{10}\\!\\left(\\frac2{a+2b+3c}\\right)");
    expect(serialized[9]).toContain("\\frac\\pi4");
    expect(paper!.questions[10]!.options).toHaveLength(5);
    expect(serialized[10]).toContain("\\frac{15}4");
    expect(serialized[11]).toContain("\\frac{x}{2x-3}");
    expect(serialized[12]).toContain("x^4-4x^3+4x^2-10=0");
    expect(serialized[13]).toContain("y^b=a^x");
    expect(serialized[14]).toContain("\\frac13");
    expect(serialized[15]).toContain("10^{c-2d}");
    expect(serialized[15]).toContain("125^{c+d}");
    expect(serialized[17]).toContain("\\sin2x\\ge\\frac12");
    expect(serialized[18]).toContain("2(1+\\sqrt5)");
    expect(serialized[19]).toContain('"tex":"x^2"');
    expect(paper!.questions.every((question) => question.explanationResourceId === "tmua-specimen-p1-worked-explanations-v1")).toBe(true);
  });
});
