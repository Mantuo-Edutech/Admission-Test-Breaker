import rawSummary from "../../../content/esat/public-source-summary.json" with { type: "json" };

export interface EsatSourceSummary {
  readonly schemaVersion: 1;
  readonly exam: "ESAT";
  readonly verifiedAt: string;
  readonly officialArchive: {
    readonly locallyVerifiedFiles: number;
    readonly coreDocuments: number;
    readonly moduleGuides: number;
    readonly historicQuestionAnswerPairs: number;
    readonly directlyPublishableFiles: number;
  };
  readonly statusZh: string;
  readonly statusEn: string;
  readonly publicationBoundaryZh: string;
  readonly nextActionZh: string;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function validateEsatSourceSummary(value: unknown): EsatSourceSummary {
  if (value === null || typeof value !== "object") {
    throw new Error("ESAT source summary must be an object");
  }
  const candidate = value as Partial<EsatSourceSummary>;
  const archive = candidate.officialArchive;
  if (
    candidate.schemaVersion !== 1 ||
    candidate.exam !== "ESAT" ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(candidate.verifiedAt ?? "") ||
    archive === undefined ||
    !positiveInteger(archive.locallyVerifiedFiles) ||
    !positiveInteger(archive.coreDocuments) ||
    !positiveInteger(archive.moduleGuides) ||
    !positiveInteger(archive.historicQuestionAnswerPairs) ||
    archive.directlyPublishableFiles !== 0 ||
    archive.locallyVerifiedFiles !== archive.coreDocuments + archive.moduleGuides + archive.historicQuestionAnswerPairs * 2 ||
    [candidate.statusZh, candidate.statusEn, candidate.publicationBoundaryZh, candidate.nextActionZh]
      .some((text) => typeof text !== "string" || text.trim().length === 0)
  ) {
    throw new Error("ESAT source summary is invalid");
  }
  return candidate as EsatSourceSummary;
}

export const ESAT_SOURCE_SUMMARY = validateEsatSourceSummary(rawSummary);
