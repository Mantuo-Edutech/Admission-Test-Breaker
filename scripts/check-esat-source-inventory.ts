import { readFile } from "node:fs/promises";

interface ResearchArtifact {
  readonly id: string;
  readonly url: string;
  readonly localPath: string;
  readonly kind: string;
  readonly downloadStatus: string;
  readonly bytes: number | null;
  readonly sha256: string | null;
  readonly publishable: boolean;
  readonly rightsStatus: string;
}

interface PinnedArtifact {
  readonly researchAssetId: string;
  readonly localPath: string;
  readonly kind: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly downloadStatus: string;
  readonly publishable: boolean;
  readonly rightsStatus: string;
}

interface SourceReference {
  readonly url: string;
  readonly artifact: PinnedArtifact;
}

interface HistoricPaper {
  readonly questionPaper: string;
  readonly answerKey: string;
  readonly questionPaperArtifact: PinnedArtifact;
  readonly answerKeyArtifact: PinnedArtifact;
}

interface EsatInventory {
  readonly schemaVersion: number;
  readonly exam: string;
  readonly verifiedAt: string;
  readonly archiveStatus: {
    readonly discoveredFiles: number;
    readonly downloadedFiles: number;
    readonly downloadedForInternalResearch: number;
    readonly publishableFiles: number;
    readonly rightsStatus: string;
  };
  readonly coreDocuments: readonly SourceReference[];
  readonly moduleGuides: readonly SourceReference[];
  readonly historicArchives: readonly {
    readonly archive: string;
    readonly papers: readonly HistoricPaper[];
  }[];
}

interface PublicSummary {
  readonly schemaVersion: number;
  readonly exam: string;
  readonly verifiedAt: string;
  readonly officialArchive: {
    readonly locallyVerifiedFiles: number;
    readonly coreDocuments: number;
    readonly moduleGuides: number;
    readonly historicQuestionAnswerPairs: number;
    readonly directlyPublishableFiles: number;
  };
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isSha256(value: string | null): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

function assertPinnedArtifact(
  url: string,
  pinned: PinnedArtifact,
  researchById: ReadonlyMap<string, ResearchArtifact>,
): void {
  const research = researchById.get(pinned.researchAssetId);
  invariant(research !== undefined, `Missing research record ${pinned.researchAssetId}`);
  invariant(research.url === url, `Source URL drift for ${pinned.researchAssetId}`);
  invariant(research.localPath === pinned.localPath, `Local-path drift for ${pinned.researchAssetId}`);
  invariant(research.kind === pinned.kind, `Artifact kind drift for ${pinned.researchAssetId}`);
  invariant(research.bytes === pinned.bytes && pinned.bytes > 0, `Byte-count drift for ${pinned.researchAssetId}`);
  invariant(research.sha256 === pinned.sha256 && isSha256(pinned.sha256), `SHA-256 drift for ${pinned.researchAssetId}`);
  invariant(research.rightsStatus === pinned.rightsStatus, `Rights-status drift for ${pinned.researchAssetId}`);
  invariant(research.downloadStatus === "downloaded", `Research download status invalid for ${pinned.researchAssetId}`);
  invariant(pinned.downloadStatus === "downloaded-internal-research-only", `Pinned download status invalid for ${pinned.researchAssetId}`);
  invariant(!research.publishable && !pinned.publishable, `Private source marked publishable: ${pinned.researchAssetId}`);
  invariant(pinned.localPath.startsWith("content/official/raw/"), `Private source path invalid: ${pinned.researchAssetId}`);
}

const [inventory, research, summary] = await Promise.all([
  readJson<EsatInventory>("content/esat/source-inventory.json"),
  readJson<{ readonly assets: readonly ResearchArtifact[] }>("content/official/research-asset-inventory.json"),
  readJson<PublicSummary>("content/esat/public-source-summary.json"),
]);

invariant(inventory.schemaVersion === 1 && inventory.exam === "ESAT", "ESAT source inventory identity is invalid");
invariant(/^\d{4}-\d{2}-\d{2}$/u.test(inventory.verifiedAt), "ESAT source inventory revision date is invalid");
invariant(inventory.coreDocuments.length === 2, "Expected 2 ESAT core documents");
invariant(inventory.moduleGuides.length === 5, "Expected 5 ESAT module guides");
invariant(inventory.historicArchives.length === 2, "Expected 2 ESAT historic archives");
invariant(inventory.historicArchives.every((archive) => archive.papers.length === 8), "Each ESAT historic archive must contain 8 paper pairs");

const researchById = new Map(research.assets.map((asset) => [asset.id, asset]));
const references: Array<{ readonly url: string; readonly artifact: PinnedArtifact }> = [
  ...inventory.coreDocuments,
  ...inventory.moduleGuides,
  ...inventory.historicArchives.flatMap((archive) => archive.papers.flatMap((paper) => [
    { url: paper.questionPaper, artifact: paper.questionPaperArtifact },
    { url: paper.answerKey, artifact: paper.answerKeyArtifact },
  ])),
];

invariant(references.length === 39, `Expected 39 ESAT source references, received ${references.length}`);
invariant(new Set(references.map((reference) => reference.url)).size === 39, "ESAT source URLs must be unique");
invariant(new Set(references.map((reference) => reference.artifact.researchAssetId)).size === 39, "ESAT research asset IDs must be unique");
for (const reference of references) {
  assertPinnedArtifact(reference.url, reference.artifact, researchById);
}

invariant(inventory.archiveStatus.discoveredFiles === 39, "ESAT discovered-file count drifted");
invariant(inventory.archiveStatus.downloadedFiles === 39, "ESAT downloaded-file count drifted");
invariant(inventory.archiveStatus.downloadedForInternalResearch === 39, "ESAT internal-research count drifted");
invariant(inventory.archiveStatus.publishableFiles === 0, "ESAT private sources must not be publishable");
invariant(inventory.archiveStatus.rightsStatus === "permission_pending", "ESAT rights boundary drifted");

const pairCount = inventory.historicArchives.reduce((total, archive) => total + archive.papers.length, 0);
invariant(summary.schemaVersion === 1 && summary.exam === "ESAT", "ESAT public summary identity is invalid");
invariant(summary.verifiedAt === inventory.verifiedAt, "ESAT public summary revision drifted");
invariant(summary.officialArchive.locallyVerifiedFiles === 39, "ESAT public file count drifted");
invariant(summary.officialArchive.coreDocuments === inventory.coreDocuments.length, "ESAT public core-document count drifted");
invariant(summary.officialArchive.moduleGuides === inventory.moduleGuides.length, "ESAT public module-guide count drifted");
invariant(summary.officialArchive.historicQuestionAnswerPairs === pairCount, "ESAT public historic-pair count drifted");
invariant(summary.officialArchive.directlyPublishableFiles === 0, "ESAT public summary must preserve the publication boundary");

process.stdout.write("ESAT tracked source inventory: PASS (39 SHA-pinned internal records; raw files not read).\n");
