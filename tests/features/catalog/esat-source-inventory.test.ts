import { describe, expect, it } from "vitest";
import rawInventory from "../../../content/esat/source-inventory.json" with { type: "json" };

interface SourceInventory {
  archiveStatus: {
    discoveredFiles: number;
    downloadedFiles: number;
    downloadedForInternalResearch: number;
    publishableFiles: number;
    rightsStatus: string;
  };
  coreDocuments: { url: string; artifact: SourceArtifact }[];
  moduleGuides: { url: string; artifact: SourceArtifact }[];
  historicArchives: {
    papers: {
      questionPaper: string;
      answerKey: string;
      questionPaperArtifact: SourceArtifact;
      answerKeyArtifact: SourceArtifact;
    }[];
  }[];
}

interface SourceArtifact {
  researchAssetId: string;
  localPath: string;
  bytes: number;
  sha256: string;
  downloadStatus: string;
  publishable: boolean;
  rightsStatus: string;
}

const inventory = rawInventory as SourceInventory;

describe("ESAT source inventory", () => {
  it("records all 39 files as verified local research assets without claiming publication rights", () => {
    expect(inventory.archiveStatus).toMatchObject({
      discoveredFiles: 39,
      downloadedFiles: 39,
      downloadedForInternalResearch: 39,
      publishableFiles: 0,
      rightsStatus: "permission_pending",
    });
    expect(inventory.coreDocuments).toHaveLength(2);
    expect(inventory.moduleGuides).toHaveLength(5);
    expect(inventory.historicArchives).toHaveLength(2);
    expect(inventory.historicArchives.every((archive) => archive.papers.length === 8)).toBe(true);
  });

  it("keeps every discovered source on the official UAT asset host", () => {
    const urls = [
      ...inventory.coreDocuments.map((document) => document.url),
      ...inventory.moduleGuides.map((guide) => guide.url),
      ...inventory.historicArchives.flatMap((archive) =>
        archive.papers.flatMap((paper) => [paper.questionPaper, paper.answerKey]),
      ),
    ];

    expect(urls).toHaveLength(39);
    expect(urls.every((url) => url.startsWith("https://uat-wp.s3.eu-west-2.amazonaws.com/"))).toBe(true);
  });

  it("pins every local artifact to an internal path, byte count and SHA-256", () => {
    const artifacts = [
      ...inventory.coreDocuments.map((document) => document.artifact),
      ...inventory.moduleGuides.map((guide) => guide.artifact),
      ...inventory.historicArchives.flatMap((archive) => archive.papers.flatMap((paper) => [
        paper.questionPaperArtifact,
        paper.answerKeyArtifact,
      ])),
    ];

    expect(artifacts).toHaveLength(39);
    expect(new Set(artifacts.map((artifact) => artifact.researchAssetId)).size).toBe(39);
    expect(artifacts.every((artifact) =>
      artifact.localPath.startsWith("content/official/raw/") &&
      artifact.bytes > 0 &&
      /^[a-f0-9]{64}$/u.test(artifact.sha256) &&
      artifact.downloadStatus === "downloaded-internal-research-only" &&
      !artifact.publishable &&
      artifact.rightsStatus.includes("permission_required"),
    )).toBe(true);
  });
});
