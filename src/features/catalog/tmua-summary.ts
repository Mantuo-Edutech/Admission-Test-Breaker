import rawSummary from "../../../content/tmua/public-summary.json" with { type: "json" };

export const TMUA_CONTENT_STAGES = [
  "discovered",
  "indexed",
  "extracted",
  "verified",
  "published",
] as const;

export type TmuaContentStage = (typeof TMUA_CONTENT_STAGES)[number];

export interface TmuaPaperSummary {
  readonly paper: 1 | 2;
  readonly contentStage: TmuaContentStage;
  readonly onlineQuestionCount: number;
}

export interface TmuaEditionSummary {
  readonly id: string;
  readonly label: string;
  readonly papers: readonly [TmuaPaperSummary, TmuaPaperSummary];
}

export interface TmuaPublicSummary {
  readonly schemaVersion: 1;
  readonly exam: "TMUA";
  readonly auditedAt: string;
  readonly importedPdfPathCount: number;
  readonly canonicalSourceCount: number;
  readonly officialSupplementCount: number;
  readonly paperCount: 18;
  readonly questionShellCount: 360;
  readonly publishedQuestionCount: number;
  readonly editions: readonly TmuaEditionSummary[];
}

const summaryFields = new Set([
  "schemaVersion",
  "exam",
  "auditedAt",
  "importedPdfPathCount",
  "canonicalSourceCount",
  "officialSupplementCount",
  "paperCount",
  "questionShellCount",
  "publishedQuestionCount",
  "editions",
]);
const editionFields = new Set(["id", "label", "papers"]);
const paperFields = new Set(["paper", "contentStage", "onlineQuestionCount"]);

function assertRecord(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertExactFields(
  value: Record<string, unknown>,
  expected: ReadonlySet<string>,
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      throw new Error(`${label} contains unsupported field ${key}`);
    }
  }
  for (const key of expected) {
    if (!(key in value)) {
      throw new Error(`${label} is missing ${key}`);
    }
  }
}

function parseNonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value as number;
}

function parseNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function parsePaper(value: unknown, label: string): TmuaPaperSummary {
  assertRecord(value, label);
  assertExactFields(value, paperFields, label);
  if (value.paper !== 1 && value.paper !== 2) {
    throw new Error(`${label}.paper must be 1 or 2`);
  }
  if (
    typeof value.contentStage !== "string" ||
    !TMUA_CONTENT_STAGES.includes(value.contentStage as TmuaContentStage)
  ) {
    throw new Error(`${label}.contentStage is unsupported`);
  }
  const onlineQuestionCount = parseNonNegativeInteger(
    value.onlineQuestionCount,
    `${label}.onlineQuestionCount`,
  );
  if (onlineQuestionCount > 20) {
    throw new Error(`${label}.onlineQuestionCount cannot exceed 20`);
  }
  if (
    (value.contentStage === "published") !== (onlineQuestionCount > 0)
  ) {
    throw new Error(`${label} publication stage and online count disagree`);
  }
  return {
    paper: value.paper,
    contentStage: value.contentStage as TmuaContentStage,
    onlineQuestionCount,
  };
}

function parseEdition(value: unknown, index: number): TmuaEditionSummary {
  const label = `editions.${index}`;
  assertRecord(value, label);
  assertExactFields(value, editionFields, label);
  if (!Array.isArray(value.papers) || value.papers.length !== 2) {
    throw new Error(`${label}.papers must contain Paper 1 and Paper 2`);
  }
  const first = parsePaper(value.papers[0], `${label}.papers.0`);
  const second = parsePaper(value.papers[1], `${label}.papers.1`);
  if (first.paper !== 1 || second.paper !== 2) {
    throw new Error(`${label}.papers must be ordered as Paper 1 then Paper 2`);
  }
  return {
    id: parseNonEmptyString(value.id, `${label}.id`),
    label: parseNonEmptyString(value.label, `${label}.label`),
    papers: [first, second],
  };
}

export function parseTmuaPublicSummary(value: unknown): TmuaPublicSummary {
  assertRecord(value, "TMUA public summary");
  assertExactFields(value, summaryFields, "TMUA public summary");
  if (value.schemaVersion !== 1) {
    throw new Error("TMUA public summary schemaVersion must be 1");
  }
  if (value.exam !== "TMUA") {
    throw new Error("TMUA public summary exam must be TMUA");
  }
  if (value.paperCount !== 18) {
    throw new Error("TMUA public summary paperCount must be 18");
  }
  if (value.questionShellCount !== 360) {
    throw new Error("TMUA public summary questionShellCount must be 360");
  }
  const auditedAt = parseNonEmptyString(value.auditedAt, "auditedAt");
  if (!Number.isFinite(Date.parse(auditedAt))) {
    throw new Error("auditedAt must be a valid date-time");
  }
  if (!Array.isArray(value.editions) || value.editions.length !== 9) {
    throw new Error("TMUA public summary must contain nine editions");
  }
  const editions = value.editions.map(parseEdition);
  const editionIds = editions.map((edition) => edition.id);
  if (new Set(editionIds).size !== editionIds.length) {
    throw new Error("TMUA public summary edition IDs must be unique");
  }
  const publishedQuestionCount = parseNonNegativeInteger(
    value.publishedQuestionCount,
    "publishedQuestionCount",
  );
  const editionPublishedCount = editions.reduce(
    (total, edition) =>
      total + edition.papers.reduce((sum, paper) => sum + paper.onlineQuestionCount, 0),
    0,
  );
  if (publishedQuestionCount !== editionPublishedCount) {
    throw new Error(
      "publishedQuestionCount must equal the sum of edition onlineQuestionCount values",
    );
  }

  return {
    schemaVersion: 1,
    exam: "TMUA",
    auditedAt,
    importedPdfPathCount: parseNonNegativeInteger(
      value.importedPdfPathCount,
      "importedPdfPathCount",
    ),
    canonicalSourceCount: parseNonNegativeInteger(
      value.canonicalSourceCount,
      "canonicalSourceCount",
    ),
    officialSupplementCount: parseNonNegativeInteger(
      value.officialSupplementCount,
      "officialSupplementCount",
    ),
    paperCount: 18,
    questionShellCount: 360,
    publishedQuestionCount,
    editions,
  };
}

export const TMUA_PUBLIC_SUMMARY = parseTmuaPublicSummary(rawSummary);
