import { OFFICIAL_TMUA_RESOURCES } from "../../../src/content/tmua/official-sources.js";
import {
  TMUA_EDITIONS,
  buildPastPaperIndex,
} from "../../../src/content/tmua/past-papers.js";
import { loadTaxonomyDirectory } from "../../../src/content/tmua/taxonomy.js";
import type {
  AuditStamp,
  CorpusManifest,
  DocumentType,
  OfficialResourceRecord,
  SourceRecord,
} from "../../../src/content/tmua/types.js";
import type { CorpusArtifacts } from "../../../src/content/tmua/verify.js";

export const fixtureAudit: AuditStamp = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  generatedBy: "tmua-corpus-cli",
  schemaVersion: 1,
  changeReason: "corpus fixture",
};

function source(
  id: string,
  documentType: DocumentType,
  index: number,
): SourceRecord {
  return {
    id,
    canonicalPath: `Tmua/fixture/${id}.pdf`,
    duplicatePaths: index < 4 ? [`Tmua/fixture/${id}(1).pdf`] : [],
    sha256: (index + 1).toString(16).padStart(64, "0"),
    fileSize: 100,
    metadata: { pages: 2 },
    provenance: id.includes("original")
      ? "original_compilation"
      : "official_source",
    documentType,
    reviewStatus: "verified",
    audit: fixtureAudit,
  };
}

export function fixtureManifest(): CorpusManifest {
  const definitions: Array<[string, DocumentType]> = [];
  for (const edition of TMUA_EDITIONS) {
    definitions.push([
      `tmua-official-${edition.id}-answer-key`,
      "answer_key",
    ]);
    for (const paper of [1, 2] as const) {
      definitions.push([
        `tmua-official-${edition.id}-paper-${paper}`,
        "question_paper",
      ]);
      if (!["2022", "2023"].includes(edition.id)) {
        definitions.push([
          `tmua-official-${edition.id}-paper-${paper}-worked-solutions`,
          "worked_solutions",
        ]);
      }
    }
  }
  definitions.push(
    ["tmua-original-student-textbook-v1", "teaching_textbook"],
    ["tmua-original-topic-workbook-v1", "topic_workbook"],
    ["tmua-original-topic-workbook-answer-map-v1", "answer_map"],
    ["tmua-original-answer-key-compilation-2016-2021-v1", "answer_map"],
    ["tmua-official-enhanced-test-specification", "content_specification"],
  );
  const sources = definitions.map(([id, documentType], index) =>
    source(id, documentType, index),
  );
  for (const [index, record] of sources.entries()) {
    if (index >= 4) {
      record.duplicatePaths.push(`Tmua/fixture/${record.id}(1).pdf`);
    } else {
      record.duplicatePaths.push(`Tmua/fixture/${record.id}(2).pdf`);
    }
  }
  return {
    schemaVersion: 1,
    generatedAt: fixtureAudit.generatedAt,
    baseline: {
      pdfCount: 96,
      uniqueContentCount: 46,
      auditedAt: "2026-07-12",
    },
    sources,
  };
}

export function fixtureOfficialResources(): OfficialResourceRecord[] {
  return OFFICIAL_TMUA_RESOURCES.map((resource) => ({
    id: resource.id,
    edition: resource.edition,
    paper: resource.paper,
    documentType: "worked_solutions",
    officialUrl: resource.officialUrl,
    expectedPages: resource.expectedPages,
    availability: "linked",
    reviewStatus: "verified",
    audit: fixtureAudit,
  }));
}

export async function validCorpusArtifacts(): Promise<CorpusArtifacts> {
  const manifest = fixtureManifest();
  const officialResources = fixtureOfficialResources();
  const index = buildPastPaperIndex({
    manifest,
    officialResources,
    audit: fixtureAudit,
  });
  const taxonomy = await loadTaxonomyDirectory("content/tmua/taxonomy");
  return {
    manifest,
    officialResources,
    papers: index.papers,
    questions: index.questions,
    publicSummary: index.publicSummary,
    taxonomy,
  };
}
