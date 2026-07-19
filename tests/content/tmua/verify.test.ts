import { describe, expect, it } from "vitest";
import { verifyCorpus } from "../../../src/content/tmua/verify.js";
import { validCorpusArtifacts } from "./corpus-fixture.js";

async function issueCodes(mutator?: (artifacts: Awaited<ReturnType<typeof validCorpusArtifacts>>) => void) {
  const artifacts = await validCorpusArtifacts();
  mutator?.(artifacts);
  return verifyCorpus(artifacts).map((issue) => issue.code);
}

describe("TMUA corpus independent release gate", () => {
  it("accepts the complete clean corpus", async () => {
    const artifacts = await validCorpusArtifacts();
    expect(verifyCorpus(artifacts)).toEqual([]);
  });

  it("blocks canonical source count drift", async () => {
    expect(
      await issueCodes((artifacts) => {
        artifacts.manifest.sources.pop();
      }),
    ).toContain("canonical_source_count");
  });

  it("blocks unsafe persisted paths", async () => {
    expect(
      await issueCodes((artifacts) => {
        const source = artifacts.manifest.sources[0];
        if (source !== undefined) source.canonicalPath = "/Users/private/file.pdf";
      }),
    ).toContain("unsafe_source_path");
  });

  it("blocks a digest assigned to more than one canonical source", async () => {
    expect(
      await issueCodes((artifacts) => {
        const [first, second] = artifacts.manifest.sources;
        if (first !== undefined && second !== undefined) {
          second.sha256 = first.sha256;
        }
      }),
    ).toContain("duplicate_canonical_digest");
  });

  it("blocks an unresolved paper relation", async () => {
    expect(
      await issueCodes((artifacts) => {
        const paper = artifacts.papers[0];
        if (paper !== undefined) paper.questionSourceId = "missing-source";
      }),
    ).toContain("unresolved_paper_source");
  });

  it("blocks duplicate paper and question IDs", async () => {
    const codes = await issueCodes((artifacts) => {
      const paper = artifacts.papers[0];
      const question = artifacts.questions[0];
      if (paper !== undefined) artifacts.papers.push(structuredClone(paper));
      if (question !== undefined) {
        artifacts.questions.push(structuredClone(question));
      }
    });
    expect(codes).toContain("duplicate_paper_id");
    expect(codes).toContain("duplicate_question_id");
  });

  it("blocks a question number outside its 1-20 paper range", async () => {
    expect(
      await issueCodes((artifacts) => {
        const question = artifacts.questions[0];
        if (question !== undefined) question.questionNumber = 21;
      }),
    ).toContain("invalid_paper_question_range");
  });

  it("blocks a false published paper", async () => {
    expect(
      await issueCodes((artifacts) => {
        const paper = artifacts.papers[0];
        if (paper !== undefined) {
          paper.id = "tmua-unapproved-p1";
          paper.contentStage = "published";
          paper.onlineQuestionCount = 20;
        }
      }),
    ).toContain("false_published_status");
  });

  it("blocks an invalid taxonomy graph", async () => {
    expect(
      await issueCodes((artifacts) => {
        const [first, second] = artifacts.taxonomy.all;
        if (first !== undefined && second !== undefined) {
          first.parentId = second.id;
          second.parentId = first.id;
        }
      }),
    ).toContain("taxonomy_cycle");
  });

  it("blocks a public summary mismatch", async () => {
    expect(
      await issueCodes((artifacts) => {
        artifacts.publicSummary.publishedQuestionCount = 19;
      }),
    ).toContain("public_summary_mismatch");
  });
});
