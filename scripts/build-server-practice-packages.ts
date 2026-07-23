import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import rawRevisions from "../content/practice/published-paper-revisions.json" with { type: "json" };
import type { PublicPracticePaper, PrivatePaperAnswerKey } from "./lib/practice-paper-packages.js";
import { allPublishedPracticePapers } from "./lib/all-published-practice-papers.js";
import {
  buildPrivatePaperAnswerKey,
  buildPublicPracticePaper,
  mergeImmutableRevisionPackages,
} from "./lib/practice-paper-packages.js";
import type { PracticePaperContentRef } from "../src/features/practice/content/published-revisions.js";

const outputDirectory = resolve("content/practice/server-delivery");
const publicPath = resolve(outputDirectory, "public-paper-payloads.json");
const privatePath = resolve(outputDirectory, "private-answer-keys.json");
const migrationsDirectory = resolve("supabase/migrations");
const writeMode = process.argv.includes("--write");

interface PublicPackageRecord {
  readonly paperRevisionId: string;
  readonly publicPayloadDigest: string;
  readonly payload: PublicPracticePaper;
}

interface PrivatePackageRecord {
  readonly paperRevisionId: string;
  readonly answerKeyDigest: string;
  readonly answerKey: PrivatePaperAnswerKey;
}

interface PackageArtifact<T> {
  readonly schemaVersion: 1;
  readonly packages: readonly T[];
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sqlJson(value: unknown): string {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

async function readArtifact<T>(path: string): Promise<PackageArtifact<T>> {
  try {
    const artifact = JSON.parse(await readFile(path, "utf8")) as PackageArtifact<T>;
    if (artifact.schemaVersion !== 1 || !Array.isArray(artifact.packages)) {
      throw new Error(`Invalid practice package artifact: ${path}`);
    }
    return artifact;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: 1, packages: [] };
    }
    throw error;
  }
}

function migrationRows(
  publicPackage: PublicPackageRecord,
  privatePackage: PrivatePackageRecord,
): { readonly publicRow: string; readonly privateRow: string } {
  return {
    publicRow:
      `insert into private.practice_paper_payloads (paper_revision_id, payload, payload_digest) values (` +
      `'${publicPackage.paperRevisionId}', ${sqlJson(publicPackage.payload)}, '${publicPackage.publicPayloadDigest}');`,
    privateRow:
      `insert into private.practice_paper_answer_keys (paper_revision_id, answer_key, answer_key_digest) values (` +
      `'${privatePackage.paperRevisionId}', ${sqlJson(privatePackage.answerKey)}, '${privatePackage.answerKeyDigest}');`,
  };
}

function validatePackagePair(
  ref: PracticePaperContentRef,
  publicPackage: PublicPackageRecord,
  privatePackage: PrivatePackageRecord,
): void {
  if (
    publicPackage.paperRevisionId !== ref.paperRevisionId ||
    publicPackage.payload.id !== ref.paperId ||
    publicPackage.payload.contentRef.paperRevisionId !== ref.paperRevisionId ||
    publicPackage.payload.contentRef.contentDigest !== ref.contentDigest ||
    publicPackage.publicPayloadDigest !== sha256(publicPackage.payload)
  ) {
    throw new Error(`Public practice package does not match immutable revision: ${ref.paperRevisionId}`);
  }
  if (
    privatePackage.paperRevisionId !== ref.paperRevisionId ||
    privatePackage.answerKey.paperId !== ref.paperId ||
    privatePackage.answerKey.paperRevisionId !== ref.paperRevisionId ||
    privatePackage.answerKey.contentDigest !== ref.contentDigest ||
    privatePackage.answerKeyDigest !== sha256(privatePackage.answerKey)
  ) {
    throw new Error(`Private answer key does not match immutable revision: ${ref.paperRevisionId}`);
  }
}

async function practicePayloadMigrations(): Promise<readonly { name: string; body: string }[]> {
  const names = (await readdir(migrationsDirectory))
    .filter((name) => /^\d{14}_published_practice_payload_(?:seed|release_[a-f0-9]{8})\.sql$/.test(name))
    .sort();
  return Promise.all(
    names.map(async (name) => ({ name, body: await readFile(resolve(migrationsDirectory, name), "utf8") })),
  );
}

function migrationTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

const revisionRecords = [...(rawRevisions.papers as PracticePaperContentRef[])].sort(
  (left, right) =>
    left.paperId.localeCompare(right.paperId) || left.revision - right.revision,
);
const latestByPaper = new Map<string, PracticePaperContentRef>();
for (const record of revisionRecords) latestByPaper.set(record.paperId, record);

const papers = [...allPublishedPracticePapers()].sort((left, right) => left.id.localeCompare(right.id));
const currentPackages = papers.map((paper) => {
  const ref = latestByPaper.get(paper.id);
  if (ref === undefined) throw new Error(`Published content ref is missing: ${paper.id}`);
  const publicPayload = buildPublicPracticePaper(paper, ref);
  const answerKey = buildPrivatePaperAnswerKey(paper, ref);
  return {
    publicPackage: {
      paperRevisionId: ref.paperRevisionId,
      publicPayloadDigest: sha256(publicPayload),
      payload: publicPayload,
    } satisfies PublicPackageRecord,
    privatePackage: {
      paperRevisionId: ref.paperRevisionId,
      answerKeyDigest: sha256(answerKey),
      answerKey,
    } satisfies PrivatePackageRecord,
  };
});

const existingPublic = await readArtifact<PublicPackageRecord>(publicPath);
const existingPrivate = await readArtifact<PrivatePackageRecord>(privatePath);
const revisionIds = revisionRecords.map((record) => record.paperRevisionId);
const publicPackages = mergeImmutableRevisionPackages(
  revisionIds,
  existingPublic.packages,
  currentPackages.map((item) => item.publicPackage),
);
const privatePackages = mergeImmutableRevisionPackages(
  revisionIds,
  existingPrivate.packages,
  currentPackages.map((item) => item.privatePackage),
);

for (const [index, ref] of revisionRecords.entries()) {
  validatePackagePair(ref, publicPackages[index]!, privatePackages[index]!);
}

const publicArtifact: PackageArtifact<PublicPackageRecord> = {
  schemaVersion: 1,
  packages: publicPackages,
};
const privateArtifact: PackageArtifact<PrivatePackageRecord> = {
  schemaVersion: 1,
  packages: privatePackages,
};
const expectedPublic = `${JSON.stringify(publicArtifact, null, 2)}\n`;
const expectedPrivate = `${JSON.stringify(privateArtifact, null, 2)}\n`;

const migrations = await practicePayloadMigrations();
const combinedMigrations = migrations.map((migration) => migration.body).join("\n");
const missingMigrationPackages: number[] = [];
for (const [index, publicPackage] of publicPackages.entries()) {
  const rows = migrationRows(publicPackage, privatePackages[index]!);
  const hasPublic = combinedMigrations.includes(rows.publicRow);
  const hasPrivate = combinedMigrations.includes(rows.privateRow);
  if (hasPublic !== hasPrivate) {
    throw new Error(`Practice payload migration is only partially published: ${publicPackage.paperRevisionId}`);
  }
  if (!hasPublic) missingMigrationPackages.push(index);
}

if (writeMode) {
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(publicPath, expectedPublic, "utf8");
  await writeFile(privatePath, expectedPrivate, "utf8");
  if (missingMigrationPackages.length > 0) {
    const releaseBody =
      "-- Append-only practice payload release generated by scripts/build-server-practice-packages.ts.\n" +
      missingMigrationPackages
        .map((index) => {
          const rows = migrationRows(publicPackages[index]!, privatePackages[index]!);
          return `${rows.publicRow}\n${rows.privateRow}`;
        })
        .join("\n") +
      "\n";
    const releaseId = sha256(releaseBody).slice(0, 8);
    const releasePath = resolve(
      migrationsDirectory,
      `${migrationTimestamp(new Date())}_published_practice_payload_release_${releaseId}.sql`,
    );
    await writeFile(releasePath, releaseBody, { encoding: "utf8", flag: "wx" });
    console.log(`Created append-only payload migration for ${missingMigrationPackages.length} revisions`);
  }
  console.log(`Built ${papers.length} current papers across ${revisionRecords.length} immutable server packages`);
} else {
  if (await readFile(publicPath, "utf8") !== expectedPublic) {
    throw new Error("Public practice payload artifact is stale; run content:publish-server-practice");
  }
  if (await readFile(privatePath, "utf8") !== expectedPrivate) {
    throw new Error("Private answer-key artifact is stale; run content:publish-server-practice");
  }
  if (missingMigrationPackages.length > 0) {
    throw new Error(
      `Server practice revisions are not covered by an append-only migration: ${missingMigrationPackages
        .map((index) => publicPackages[index]!.paperRevisionId)
        .join(", ")}`,
    );
  }
  console.log(`Verified ${papers.length} current papers across ${revisionRecords.length} immutable server packages`);
}
