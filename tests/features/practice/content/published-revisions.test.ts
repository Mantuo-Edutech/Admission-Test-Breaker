import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { allPublishedPracticePapers } from "../../../../scripts/lib/all-published-practice-papers.js";
import {
  buildPracticePublicationLedger,
  practicePaperDigest,
} from "../../../../scripts/lib/practice-paper-publication.js";
import {
  PUBLISHED_PRACTICE_REVISIONS,
  publishPracticePaper,
} from "../../../../src/features/practice/content/published-revisions.js";

describe("published practice revisions", () => {
  it("pins every published paper across all five exams to its exact digest", () => {
    const papers = allPublishedPracticePapers();
    expect(papers).toHaveLength(44);
    expect(new Set(PUBLISHED_PRACTICE_REVISIONS.papers.map((paper) => paper.paperId)).size).toBe(papers.length);

    for (const paper of papers) {
      const record = PUBLISHED_PRACTICE_REVISIONS.papers.find(
        (candidate) => candidate.paperId === paper.id,
      );
      expect(record, paper.id).toBeDefined();
      expect(record).toMatchObject({
        exam: paper.exam,
        questionCount: paper.questions.length,
        durationMinutes: paper.durationMinutes,
        contentDigest: practicePaperDigest(paper),
      });
      expect(publishPracticePaper(paper).contentRef).toMatchObject({
        paperId: paper.id,
        paperRevisionId: record!.paperRevisionId,
        contentDigest: record!.contentDigest,
      });
    }
  });

  it("appends a changed revision without deleting the historical payload reference", () => {
    const source = structuredClone(allPublishedPracticePapers()[0]!);
    const initial = buildPracticePublicationLedger([source], [], "2026-07-23T00:00:00.000Z");
    source.questions[0]!.skillTags = [...source.questions[0]!.skillTags, "revision-test"];
    const changed = buildPracticePublicationLedger(
      [source],
      initial.records,
      "2026-07-24T00:00:00.000Z",
    );

    expect(changed.records.map((record) => record.paperRevisionId)).toEqual([
      `${source.id}-r1`,
      `${source.id}-r2`,
    ]);
    expect(changed.records[0]!.contentDigest).toBe(initial.records[0]!.contentDigest);
    expect(changed.currentRecords[0]).toMatchObject({ revision: 2, paperRevisionId: `${source.id}-r2` });
  });

  it("includes the 18 archived TMUA papers separately from the starting diagnostic", () => {
    const tmua = PUBLISHED_PRACTICE_REVISIONS.papers.filter((paper) => paper.exam === "TMUA");
    expect(tmua.filter((paper) => paper.paperId !== "tmua-diagnostic-v1")).toHaveLength(18);
    expect(tmua.some((paper) => paper.paperId === "tmua-diagnostic-v1")).toBe(true);
  });

  it("keeps every browser publication reference seeded in the server registry", async () => {
    const sql = await readFile(
      resolve("supabase/migrations/20260723220100_published_practice_revision_seed.sql"),
      "utf8",
    );
    for (const record of PUBLISHED_PRACTICE_REVISIONS.papers) {
      expect(sql, record.paperId).toContain(
        `('${record.paperRevisionId}', '${record.paperId}', ${record.revision}, '${record.exam}', ${record.schemaVersion}, '${record.contentDigest}', ${record.questionCount}, ${record.durationMinutes},`,
      );
    }
  });
});
