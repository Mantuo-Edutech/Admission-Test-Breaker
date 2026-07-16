import { createHash } from "node:crypto";
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
      expect(validatePracticePaper(paper!)).toEqual([]);
      totalQuestions += paper?.questions.length ?? 0;
    }
    expect(totalQuestions).toBe(360);
  });

  it("keeps the native paper structured and the other 17 tied to exact source pages", () => {
    expect(getTmuaPracticePaper("tmua-2023-p1")?.deliveryMode).toBe("structured");
    const pdfBacked = TMUA_ONLINE_PAPERS
      .filter((record) => record.id !== "tmua-2023-p1")
      .map((record) => getTmuaPracticePaper(record.id));
    expect(pdfBacked).toHaveLength(17);
    expect(pdfBacked.every((paper) => paper?.deliveryMode === "source-pdf-answer-sheet")).toBe(true);

    const paper = getTmuaPracticePaper("tmua-2022-p2");
    expect(paper?.questions[0]).toMatchObject({
      id: "tmua-2022-p2-q01",
      sourcePage: 3,
      correctAnswer: "B",
      prompt: [{ kind: "source-pdf", src: "/papers/tmua/tmua-2022-p2.pdf", page: 3 }],
    });
  });

  it("ships the exact audited PDF bytes referenced by the manifest", async () => {
    for (const record of TMUA_ONLINE_PAPERS) {
      const bytes = await readFile(resolve("public", record.publicDocumentPath.slice(1)));
      expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        record.questionSourceSha256,
      );
    }
  });
});
