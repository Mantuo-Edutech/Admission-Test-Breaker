import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

interface ResearchArtifact {
  readonly id: string;
  readonly url: string;
  readonly kind: string;
  readonly localPath: string;
  readonly downloadStatus: "downloaded" | "failed";
  readonly bytes: number | null;
  readonly sha256: string | null;
  readonly publishable: false;
  readonly rightsStatus: string;
}

interface ResearchInventory {
  readonly assets: readonly ResearchArtifact[];
}

interface EsatSourceReference {
  readonly url: string;
  readonly [key: string]: unknown;
}

interface EsatSourceInventory {
  readonly schemaVersion: number;
  readonly exam: "ESAT";
  readonly coreDocuments: readonly EsatSourceReference[];
  readonly moduleGuides: readonly EsatSourceReference[];
  readonly historicArchives: readonly {
    readonly archive: string;
    readonly papers: readonly {
      readonly year: number;
      readonly questionPaper: string;
      readonly answerKey: string;
      readonly [key: string]: unknown;
    }[];
  }[];
  readonly [key: string]: unknown;
}

interface VerifiedArtifact {
  readonly researchAssetId: string;
  readonly localPath: string;
  readonly kind: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly downloadStatus: "downloaded-internal-research-only";
  readonly publishable: false;
  readonly rightsStatus: string;
}

const root = process.cwd();
const sourcePath = path.resolve(root, "content/esat/source-inventory.json");
const researchPath = path.resolve(root, "content/official/research-asset-inventory.json");
const publicSummaryPath = path.resolve(root, "content/esat/public-source-summary.json");

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function verifyArtifact(
  url: string,
  artifactsByUrl: ReadonlyMap<string, ResearchArtifact>,
): Promise<VerifiedArtifact> {
  const artifact = artifactsByUrl.get(url);
  if (
    artifact === undefined ||
    artifact.downloadStatus !== "downloaded" ||
    artifact.bytes === null ||
    artifact.sha256 === null
  ) {
    throw new Error(`ESAT source is not present in the research archive: ${url}`);
  }

  const absolutePath = path.resolve(root, artifact.localPath);
  const [metadata, bytes] = await Promise.all([stat(absolutePath), readFile(absolutePath)]);
  const actualSha256 = sha256(bytes);
  if (metadata.size !== artifact.bytes || actualSha256 !== artifact.sha256) {
    throw new Error(`ESAT source integrity mismatch: ${artifact.localPath}`);
  }

  return {
    researchAssetId: artifact.id,
    localPath: artifact.localPath,
    kind: artifact.kind,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
    downloadStatus: "downloaded-internal-research-only",
    publishable: false,
    rightsStatus: artifact.rightsStatus,
  };
}

async function main(): Promise<void> {
  const [sourceText, existingPublicSummary, research] = await Promise.all([
    readFile(sourcePath, "utf8"),
    readFile(publicSummaryPath, "utf8").catch(() => ""),
    readFile(researchPath, "utf8").then((value) => JSON.parse(value) as ResearchInventory),
  ]);
  const source = JSON.parse(sourceText) as EsatSourceInventory;
  const artifactsByUrl = new Map(research.assets.map((artifact) => [artifact.url, artifact]));

  const coreDocuments = await Promise.all(source.coreDocuments.map(async (document) => ({
    ...document,
    artifact: await verifyArtifact(document.url, artifactsByUrl),
  })));
  const moduleGuides = await Promise.all(source.moduleGuides.map(async (guide) => ({
    ...guide,
    artifact: await verifyArtifact(guide.url, artifactsByUrl),
  })));
  const historicArchives = await Promise.all(source.historicArchives.map(async (archive) => ({
    ...archive,
    papers: await Promise.all(archive.papers.map(async (paper) => ({
      ...paper,
      questionPaperArtifact: await verifyArtifact(paper.questionPaper, artifactsByUrl),
      answerKeyArtifact: await verifyArtifact(paper.answerKey, artifactsByUrl),
    }))),
  })));

  const allArtifacts = [
    ...coreDocuments.map((document) => document.artifact),
    ...moduleGuides.map((guide) => guide.artifact),
    ...historicArchives.flatMap((archive) => archive.papers.flatMap((paper) => [
      paper.questionPaperArtifact,
      paper.answerKeyArtifact,
    ])),
  ];
  if (allArtifacts.length !== 39 || new Set(allArtifacts.map((artifact) => artifact.researchAssetId)).size !== 39) {
    throw new Error(`Expected 39 unique ESAT artifacts, received ${allArtifacts.length}`);
  }

  const nextInventory = {
    ...source,
    verifiedAt: "2026-07-18",
    archiveStatus: {
      discoveredFiles: 39,
      downloadedFiles: 39,
      downloadedForInternalResearch: 39,
      publishableFiles: 0,
      rightsStatus: "permission_pending",
      note: "All 39 official files are present locally with verified byte counts and SHA-256 hashes for internal research. Downloaded does not mean publication-ready; direct republication remains blocked until written permission or legal clearance is recorded.",
    },
    coreDocuments,
    moduleGuides,
    historicArchives,
  };
  const nextText = `${JSON.stringify(nextInventory, null, 2)}\n`;
  const publicSummary = {
    schemaVersion: 1,
    exam: "ESAT",
    verifiedAt: "2026-07-18",
    officialArchive: {
      locallyVerifiedFiles: allArtifacts.length,
      coreDocuments: coreDocuments.length,
      moduleGuides: moduleGuides.length,
      historicQuestionAnswerPairs: historicArchives.reduce((total, archive) => total + archive.papers.length, 0),
      directlyPublishableFiles: 0,
    },
    statusZh: "39 份官方资料已完整下载并通过文件校验",
    statusEn: "39 official files downloaded and integrity-verified",
    publicationBoundaryZh: "原件只保存在内部教研库；在书面许可或独立权利审核完成前，本站不会公开原 PDF，也不会把历史卷链接冒充原生在线题库。",
    nextActionZh: "按 Mathematics 1、Biology、Chemistry、Physics、Mathematics 2 五个模块完成题目拆分、来源映射、权利审核和教研复核后，再发布本站原生练习。",
  } as const;
  const nextPublicSummary = `${JSON.stringify(publicSummary, null, 2)}\n`;
  if (process.argv.includes("--verify")) {
    if (sourceText !== nextText || existingPublicSummary !== nextPublicSummary) {
      throw new Error("ESAT source inventory is stale. Run pnpm esat:build-source-inventory.");
    }
    process.stdout.write(`ESAT source inventory: PASS (${allArtifacts.length} verified artifacts).\n`);
    return;
  }
  await Promise.all([
    writeFile(sourcePath, nextText, "utf8"),
    writeFile(publicSummaryPath, nextPublicSummary, "utf8"),
  ]);
  process.stdout.write(`Verified and indexed ${allArtifacts.length} ESAT research artifacts.\n`);
}

await main();
