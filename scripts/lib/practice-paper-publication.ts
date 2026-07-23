import { createHash } from "node:crypto";
import type { PracticePaper } from "../../src/features/practice/content/types.js";

export interface PracticePublicationRecord {
  readonly paperId: string;
  readonly paperRevisionId: string;
  readonly revision: number;
  readonly exam: PracticePaper["exam"];
  readonly schemaVersion: 1;
  readonly contentDigest: string;
  readonly questionCount: number;
  readonly durationMinutes: number;
  readonly publishedAt: string;
}

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalise(item)]),
    );
  }
  return value;
}

export function practicePaperDigest(paper: PracticePaper): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalise(paper)))
    .digest("hex");
}

export function buildPracticePublicationLedger(
  papers: readonly PracticePaper[],
  existingRecords: readonly PracticePublicationRecord[],
  now: string,
): { readonly records: readonly PracticePublicationRecord[]; readonly currentRecords: readonly PracticePublicationRecord[] } {
  const existingByPaper = new Map<string, PracticePublicationRecord>();
  for (const record of existingRecords) {
    const current = existingByPaper.get(record.paperId);
    if (current === undefined || record.revision > current.revision) {
      existingByPaper.set(record.paperId, record);
    }
  }
  const currentRecords = [...papers]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((paper): PracticePublicationRecord => {
      const existing = existingByPaper.get(paper.id);
      const contentDigest = practicePaperDigest(paper);
      const changed = existing !== undefined && existing.contentDigest !== contentDigest;
      const revision = existing === undefined ? 1 : changed ? existing.revision + 1 : existing.revision;
      return {
        paperId: paper.id,
        paperRevisionId: `${paper.id}-r${revision}`,
        revision,
        exam: paper.exam,
        schemaVersion: 1,
        contentDigest,
        questionCount: paper.questions.length,
        durationMinutes: paper.durationMinutes,
        publishedAt: existing === undefined || changed ? now : existing.publishedAt,
      };
    });
  const currentRevisionIds = new Set(currentRecords.map((record) => record.paperRevisionId));
  return {
    currentRecords,
    records: [
      ...existingRecords.filter((record) => !currentRevisionIds.has(record.paperRevisionId)),
      ...currentRecords,
    ].sort((left, right) => left.paperId.localeCompare(right.paperId) || left.revision - right.revision),
  };
}
