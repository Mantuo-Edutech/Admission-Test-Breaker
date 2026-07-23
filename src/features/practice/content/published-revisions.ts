import rawManifest from "../../../../content/practice/published-paper-revisions.json" with { type: "json" };
import type { PracticePaper } from "./types.js";

export interface PracticePaperContentRef {
  readonly paperId: string;
  readonly paperRevisionId: string;
  readonly revision: number;
  readonly schemaVersion: 1;
  readonly contentDigest: string;
}

export type PublishedPracticePaper = PracticePaper & {
  readonly contentRef: PracticePaperContentRef;
};

interface PublishedRevisionManifest {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly papers: readonly (PracticePaperContentRef & {
    readonly exam: PracticePaper["exam"];
    readonly questionCount: number;
    readonly durationMinutes: number;
    readonly publishedAt: string;
  })[];
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function parseManifest(value: unknown): PublishedRevisionManifest {
  assertRecord(value, "Published practice revision manifest");
  if (
    value.schemaVersion !== 1 ||
    typeof value.generatedAt !== "string" ||
    !Array.isArray(value.papers) ||
    value.papers.length === 0
  ) {
    throw new Error("Published practice revision manifest header is invalid");
  }
  const papers = value.papers.map((candidate, index) => {
    assertRecord(candidate, `papers.${index}`);
    if (
      typeof candidate.paperId !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(candidate.paperId) ||
      candidate.paperRevisionId !== `${candidate.paperId}-r${String(candidate.revision)}` ||
      !Number.isInteger(candidate.revision) ||
      (candidate.revision as number) < 1 ||
      candidate.schemaVersion !== 1 ||
      typeof candidate.contentDigest !== "string" ||
      !/^[a-f0-9]{64}$/u.test(candidate.contentDigest) ||
      (candidate.exam !== "TMUA" && candidate.exam !== "ESAT" && candidate.exam !== "TARA" && candidate.exam !== "LNAT" && candidate.exam !== "UCAT") ||
      !Number.isInteger(candidate.questionCount) ||
      (candidate.questionCount as number) < 1 ||
      !Number.isInteger(candidate.durationMinutes) ||
      (candidate.durationMinutes as number) < 1 ||
      typeof candidate.publishedAt !== "string"
    ) {
      throw new Error(`Published practice revision ${index} is invalid`);
    }
    return candidate as unknown as PublishedRevisionManifest["papers"][number];
  });
  if (new Set(papers.map((paper) => paper.paperRevisionId)).size !== papers.length) {
    throw new Error("Published practice revision IDs must be unique");
  }
  return {
    schemaVersion: 1,
    generatedAt: value.generatedAt,
    papers,
  };
}

export const PUBLISHED_PRACTICE_REVISIONS = parseManifest(rawManifest);

const revisionByPaperId = new Map<string, PublishedRevisionManifest["papers"][number]>();
const revisionByRevisionId = new Map(
  PUBLISHED_PRACTICE_REVISIONS.papers.map((record) => [record.paperRevisionId, record]),
);
for (const record of PUBLISHED_PRACTICE_REVISIONS.papers) {
  const current = revisionByPaperId.get(record.paperId);
  if (current === undefined || record.revision > current.revision) {
    revisionByPaperId.set(record.paperId, record);
  }
}

export function publishedContentRefForPaperId(paperId: string): PracticePaperContentRef | null {
  const record = revisionByPaperId.get(paperId);
  if (record === undefined) return null;
  return {
    paperId: record.paperId,
    paperRevisionId: record.paperRevisionId,
    revision: record.revision,
    schemaVersion: record.schemaVersion,
    contentDigest: record.contentDigest,
  };
}

export function publishedContentRefForRevisionId(
  paperRevisionId: string,
): PracticePaperContentRef | null {
  const record = revisionByRevisionId.get(paperRevisionId);
  if (record === undefined) return null;
  return {
    paperId: record.paperId,
    paperRevisionId: record.paperRevisionId,
    revision: record.revision,
    schemaVersion: record.schemaVersion,
    contentDigest: record.contentDigest,
  };
}

export function publishPracticePaper(paper: PracticePaper): PublishedPracticePaper {
  const existing = (paper as Partial<PublishedPracticePaper>).contentRef;
  if (existing !== undefined) return paper as PublishedPracticePaper;
  const record = revisionByPaperId.get(paper.id);
  if (record === undefined) {
    throw new Error(`Practice paper has no published revision: ${paper.id}`);
  }
  if (
    record.exam !== paper.exam ||
    record.questionCount !== paper.questions.length ||
    record.durationMinutes !== paper.durationMinutes
  ) {
    throw new Error(`Practice paper does not match its published revision: ${paper.id}`);
  }
  const contentRef = publishedContentRefForPaperId(paper.id)!;
  Object.defineProperty(paper, "contentRef", {
    value: contentRef,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return paper as PublishedPracticePaper;
}

export function sessionContentMatchesPaper(
  session: { readonly paperId: string; readonly paperRevisionId: string; readonly contentDigest: string },
  paper: { readonly id: string; readonly contentRef: PracticePaperContentRef },
): boolean {
  return session.paperId === paper.id &&
    session.paperRevisionId === paper.contentRef.paperRevisionId &&
    session.contentDigest === paper.contentRef.contentDigest;
}
