import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { allPublishedPracticePapers } from "./lib/all-published-practice-papers.js";
import {
  buildPracticePublicationLedger,
  type PracticePublicationRecord,
} from "./lib/practice-paper-publication.js";

const manifestPath = resolve("content/practice/published-paper-revisions.json");
const writeMode = process.argv.includes("--write");

interface PublicationManifest {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly papers: readonly PracticePublicationRecord[];
}

async function readExisting(): Promise<PublicationManifest | null> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as PublicationManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function main(): Promise<void> {
  const existing = await readExisting();
  const existingRecords = [...(existing?.papers ?? [])];
  const now = new Date().toISOString();
  const papers = [...allPublishedPracticePapers()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const { records, currentRecords } = buildPracticePublicationLedger(papers, existingRecords, now);
  const existingByPaper = new Map(existingRecords.map((record) => [record.paperId, record]));
  const manifest: PublicationManifest = {
    schemaVersion: 1,
    generatedAt: writeMode ? now : existing?.generatedAt ?? now,
    papers: records,
  };

  if (writeMode) {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Published ${currentRecords.length} current papers across ${records.length} immutable revisions`);
    return;
  }

  if (existing === null) {
    throw new Error("Published practice revision manifest is missing; run with --write");
  }
  const expected = JSON.stringify({ ...manifest, generatedAt: existing.generatedAt });
  const actual = JSON.stringify(existing);
  if (expected !== actual) {
    const changed = currentRecords
      .filter((record) => existingByPaper.get(record.paperId)?.contentDigest !== record.contentDigest)
      .map((record) => record.paperId);
    throw new Error(
      `Published practice revisions are stale${changed.length === 0 ? "" : `: ${changed.join(", ")}`}; run content:publish-practice-revisions after review`,
    );
  }
  console.log(`Verified ${currentRecords.length} current papers across ${records.length} immutable revisions`);
}

await main();
