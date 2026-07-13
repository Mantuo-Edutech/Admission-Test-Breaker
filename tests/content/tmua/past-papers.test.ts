import { describe, expect, it } from "vitest";
import {
  TMUA_EDITIONS,
  buildPastPaperIndex,
} from "../../../src/content/tmua/past-papers.js";
import type {
  AuditStamp,
  CorpusManifest,
  DocumentType,
  OfficialResourceRecord,
  SourceRecord,
} from "../../../src/content/tmua/types.js";

const audit: AuditStamp = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  generatedBy: "tmua-corpus-cli",
  schemaVersion: 1,
  changeReason: "past-paper test",
};

function source(
  id: string,
  documentType: DocumentType,
  index: number,
): SourceRecord {
  return {
    id,
    canonicalPath: `Tmua/fixture/${id}.pdf`,
    duplicatePaths: [],
    sha256: (index + 1).toString(16).padStart(64, "0"),
    fileSize: 100,
    metadata: { pages: 2 },
    provenance: id.includes("original")
      ? "original_compilation"
      : "official_source",
    documentType,
    reviewStatus: "verified",
    audit,
  };
}

function corpusManifest(): CorpusManifest {
  const sources: Array<[string, DocumentType]> = [];
  for (const edition of TMUA_EDITIONS) {
    sources.push([
      `tmua-official-${edition.id}-answer-key`,
      "answer_key",
    ]);
    for (const paper of [1, 2] as const) {
      sources.push([
        `tmua-official-${edition.id}-paper-${paper}`,
        "question_paper",
      ]);
      if (!["2022", "2023"].includes(edition.id)) {
        sources.push([
          `tmua-official-${edition.id}-paper-${paper}-worked-solutions`,
          "worked_solutions",
        ]);
      }
    }
  }
  sources.push(
    ["tmua-original-student-textbook-v1", "teaching_textbook"],
    ["tmua-original-topic-workbook-v1", "topic_workbook"],
    ["tmua-original-topic-workbook-answer-map-v1", "answer_map"],
    ["tmua-original-answer-key-compilation-2016-2021-v1", "answer_map"],
    ["tmua-official-enhanced-test-specification", "content_specification"],
  );
  return {
    schemaVersion: 1,
    generatedAt: audit.generatedAt,
    baseline: {
      pdfCount: 96,
      uniqueContentCount: 46,
      auditedAt: "2026-07-12",
    },
    sources: sources.map(([id, documentType], index) =>
      source(id, documentType, index),
    ),
  };
}

function officialResources(): OfficialResourceRecord[] {
  return ["2022", "2023"].flatMap((edition) =>
    ([1, 2] as const).map((paper) => ({
      id: `tmua-official-${edition}-paper-${paper}-worked-solutions`,
      edition,
      paper,
      documentType: "worked_solutions" as const,
      officialUrl: `https://uat-wp.s3.eu-west-2.amazonaws.com/${edition}-p${paper}.pdf`,
      expectedPages: 20,
      availability: "linked" as const,
      reviewStatus: "verified" as const,
      audit,
    })),
  );
}

describe("complete TMUA past-paper index", () => {
  it("uses the approved nine-edition order", () => {
    expect(TMUA_EDITIONS).toEqual([
      { id: "specimen", label: "Early specimen" },
      { id: "practice-2016", label: "2016 Practice" },
      { id: "2017", label: "2017" },
      { id: "2018", label: "2018" },
      { id: "2019", label: "2019" },
      { id: "2020", label: "2020" },
      { id: "2021", label: "2021" },
      { id: "2022", label: "2022" },
      { id: "2023", label: "2023" },
    ]);
  });

  it("builds 18 papers and 360 unique, source-linked shells", () => {
    const result = buildPastPaperIndex({
      manifest: corpusManifest(),
      officialResources: officialResources(),
      audit,
    });

    expect(result.papers).toHaveLength(18);
    expect(result.questions).toHaveLength(360);
    expect(new Set(result.papers.map((paper) => paper.id)).size).toBe(18);
    expect(new Set(result.questions.map((question) => question.id)).size).toBe(
      360,
    );
    for (const paper of result.papers) {
      const questions = result.questions.filter(
        (question) =>
          question.edition === paper.edition && question.paper === paper.paper,
      );
      expect(questions.map((question) => question.questionNumber)).toEqual(
        Array.from({ length: 20 }, (_, index) => index + 1),
      );
      expect(questions.every((question) => question.prompt === null)).toBe(true);
      expect(questions.every((question) => question.options.length === 0)).toBe(
        true,
      );
      expect(questions.every((question) => question.correctAnswer === null)).toBe(
        true,
      );
      expect(paper.completeness).toBe("complete");
    }
  });

  it("publishes only the verified 2023 Paper 1 content IDs", () => {
    const result = buildPastPaperIndex({
      manifest: corpusManifest(),
      officialResources: officialResources(),
      audit,
    });
    const publishedPapers = result.papers.filter(
      (paper) => paper.contentStage === "published",
    );
    const publishedQuestions = result.questions.filter(
      (question) => question.contentStage === "published",
    );

    expect(publishedPapers).toEqual([
      expect.objectContaining({
        id: "tmua-2023-p1",
        onlineQuestionCount: 20,
      }),
    ]);
    expect(publishedQuestions).toHaveLength(20);
    expect(publishedQuestions.map((question) => question.onlineContentId)).toEqual(
      Array.from(
        { length: 20 },
        (_, index) => `tmua-2023-p1-q${String(index + 1).padStart(2, "0")}`,
      ),
    );
    expect(
      result.questions
        .filter((question) => question.edition !== "2023" || question.paper !== 1)
        .every(
          (question) =>
            question.contentStage === "indexed" &&
            question.reviewStatus === "needs_review" &&
            question.onlineContentId === undefined,
        ),
    ).toBe(true);
  });

  it("derives a UI-safe 96/46/4/18/360/20 public summary", () => {
    const result = buildPastPaperIndex({
      manifest: corpusManifest(),
      officialResources: officialResources(),
      audit,
    });

    expect(result.publicSummary).toMatchObject({
      schemaVersion: 1,
      exam: "TMUA",
      importedPdfPathCount: 96,
      canonicalSourceCount: 46,
      officialSupplementCount: 4,
      paperCount: 18,
      questionShellCount: 360,
      publishedQuestionCount: 20,
    });
    expect(result.publicSummary.editions).toHaveLength(9);
    expect(JSON.stringify(result.publicSummary)).not.toMatch(
      /canonicalPath|sha256|officialUrl|\/Users\//u,
    );
  });

  it("blocks a missing source relation", () => {
    const manifest = corpusManifest();
    manifest.sources = manifest.sources.filter(
      (record) => record.id !== "tmua-official-2021-answer-key",
    );

    expect(() =>
      buildPastPaperIndex({
        manifest,
        officialResources: officialResources(),
        audit,
      }),
    ).toThrow(/unresolved source.*2021-answer-key/i);
  });

  it("blocks publication when the verified online dataset is incomplete", () => {
    expect(() =>
      buildPastPaperIndex({
        manifest: corpusManifest(),
        officialResources: officialResources(),
        audit,
        publishedQuestionIds: Array.from(
          { length: 19 },
          (_, index) => `tmua-2023-p1-q${String(index + 1).padStart(2, "0")}`,
        ),
      }),
    ).toThrow(/exactly 20.*2023 Paper 1/i);
  });
});
