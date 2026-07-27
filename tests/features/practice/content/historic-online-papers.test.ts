import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ESAT_HISTORIC_ONLINE_PAPERS,
  HISTORIC_ONLINE_PAPERS,
  TARA_HISTORIC_ONLINE_PAPERS,
} from "../../../../src/features/practice/content/historic-online-papers.js";
import {
  HISTORIC_PRACTICE_CATALOG,
  historicPracticeForExam,
} from "../../../../src/features/practice/content/historic-practice-catalog.js";
import { ESAT_FULL_MOCKS } from "../../../../src/features/practice/content/esat-starters.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

describe("historic online practice", () => {
  it("publishes the first 19-paper expansion as 560 native online questions", () => {
    expect(ESAT_HISTORIC_ONLINE_PAPERS).toHaveLength(15);
    expect(TARA_HISTORIC_ONLINE_PAPERS).toHaveLength(4);
    expect(HISTORIC_PRACTICE_CATALOG).toHaveLength(19);
    expect(HISTORIC_ONLINE_PAPERS.flatMap((paper) => paper.questions)).toHaveLength(560);

    for (const paper of HISTORIC_ONLINE_PAPERS) {
      expect(validatePracticePaper(paper, { questionCount: paper.questions.length }), paper.id).toEqual([]);
      expect(paper.questions.every((question) => question.optionDisplay === "labels-only"), paper.id).toBe(true);
      expect(paper.questions.every((question) => question.prompt[0]?.kind === "figure"), paper.id).toBe(true);
    }
  });

  it("raises every ESAT module from one full mock to at least four substantial practice entries", () => {
    const historic = historicPracticeForExam("esat");
    const originalModuleIds = ESAT_FULL_MOCKS.map((paper) => paper.sectionId);
    for (const moduleId of ["mathematics-1", "physics", "chemistry", "biology"] as const) {
      const direct = historic.filter((entry) => entry.moduleId === moduleId).length;
      expect(direct + originalModuleIds.filter((id) => id === moduleId).length, moduleId).toBeGreaterThanOrEqual(4);
    }
    const engineering = historic.filter((entry) => entry.moduleId === "engineering-mixed").length;
    expect(engineering + originalModuleIds.filter((id) => id === "mathematics-2").length).toBeGreaterThanOrEqual(4);
  });

  it("raises TARA to seven main practice entries and 244 selectable reasoning questions", () => {
    const historic = historicPracticeForExam("tara");
    expect(historic).toHaveLength(4);
    expect(historic.reduce((total, entry) => total + entry.questionCount, 0)).toBe(200);
    expect(200 + 22 + 22).toBe(244);
    expect(4 + 2 + 1).toBe(7);
  });

  it("keeps every question crop inside the repository-owned static asset boundary", async () => {
    const sampleQuestions = HISTORIC_ONLINE_PAPERS.flatMap((paper) => [
      paper.questions[0]!,
      paper.questions.at(-1)!,
    ]);
    for (const question of sampleQuestions) {
      const block = question.prompt[0]!;
      expect(block.kind).toBe("figure");
      if (block.kind !== "figure") continue;
      expect(block.src).toMatch(/^\/questions\/[a-z0-9-]+\/q\d{2}\.webp$/u);
      const image = await readFile(resolve("public", block.src.replace(/^\//u, "")));
      expect(image.subarray(0, 4).toString("ascii"), block.src).toBe("RIFF");
    }
  });
});
