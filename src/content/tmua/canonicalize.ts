import { basename } from "node:path";
import { classifyPdf, type PdfClassification } from "./classify.js";
import type { RawPdfFacts } from "./pdf-tools.js";
import type { AuditStamp, SourceRecord } from "./types.js";

function classificationKey(classification: PdfClassification): string {
  return JSON.stringify({
    provenance: classification.provenance,
    documentType: classification.documentType,
    edition: classification.edition ?? null,
    paper: classification.paper ?? null,
  });
}

function directoryMatchScore(
  path: string,
  classification: PdfClassification,
): number {
  const normalized = path.toLowerCase();
  switch (classification.documentType) {
    case "answer_key":
      return normalized.includes("/2016-2023 answer key/") ? 0 : 1;
    case "worked_solutions":
      return normalized.includes("/2016-2023 answer/") ? 0 : 1;
    case "question_paper":
      return normalized.includes("/2016-2023paper/") ? 0 : 1;
    case "topic_workbook":
    case "answer_map":
      return normalized.includes("/student workbook/") ? 0 : 1;
    default:
      return 0;
  }
}

function compareCanonicalCandidates(
  left: RawPdfFacts,
  right: RawPdfFacts,
  classification: PdfClassification,
): number {
  const leftCopy = /\(1\)(?=\.pdf$)/iu.test(basename(left.portablePath)) ? 1 : 0;
  const rightCopy = /\(1\)(?=\.pdf$)/iu.test(basename(right.portablePath)) ? 1 : 0;
  if (leftCopy !== rightCopy) return leftCopy - rightCopy;

  const directoryDifference =
    directoryMatchScore(left.portablePath, classification) -
    directoryMatchScore(right.portablePath, classification);
  if (directoryDifference !== 0) return directoryDifference;

  const lengthDifference = left.portablePath.length - right.portablePath.length;
  if (lengthDifference !== 0) return lengthDifference;
  return left.portablePath.localeCompare(right.portablePath, "en");
}

function stableSourceId(
  classification: PdfClassification,
  canonicalPath: string,
): string {
  switch (classification.documentType) {
    case "teaching_textbook":
      return "tmua-original-student-textbook-v1";
    case "topic_workbook":
      return "tmua-original-topic-workbook-v1";
    case "content_specification":
      return "tmua-official-enhanced-test-specification";
    case "question_paper":
      return `tmua-official-${classification.edition}-paper-${classification.paper}`;
    case "answer_key":
      return `tmua-official-${classification.edition}-answer-key`;
    case "worked_solutions":
      return `tmua-official-${classification.edition}-paper-${classification.paper}-worked-solutions`;
    case "answer_map":
      return canonicalPath.includes("student workbook/")
        ? "tmua-original-topic-workbook-answer-map-v1"
        : "tmua-original-answer-key-compilation-2016-2021-v1";
    default:
      throw new Error(
        `No stable source ID rule for ${classification.documentType}`,
      );
  }
}

export function groupCanonicalSources(
  facts: RawPdfFacts[],
  audit: AuditStamp,
): SourceRecord[] {
  const groups = new Map<string, RawPdfFacts[]>();
  for (const fact of facts) {
    const group = groups.get(fact.sha256) ?? [];
    group.push(fact);
    groups.set(fact.sha256, group);
  }

  const sources = [...groups.values()].map((group) => {
    const classifications = group.map((fact) => classifyPdf(fact));
    const keys = new Set(classifications.map(classificationKey));
    if (keys.size !== 1) {
      throw new Error(
        `Duplicate digest has conflicting classifications: ${group
          .map((fact) => fact.portablePath)
          .join(", ")}`,
      );
    }

    const classification = classifications[0];
    if (classification === undefined) {
      throw new Error("Cannot canonicalize an empty digest group");
    }
    const sorted = [...group].sort((left, right) =>
      compareCanonicalCandidates(left, right, classification),
    );
    const canonical = sorted[0];
    if (canonical === undefined) {
      throw new Error("Cannot canonicalize an empty digest group");
    }

    return {
      id: stableSourceId(classification, canonical.portablePath),
      canonicalPath: canonical.portablePath,
      duplicatePaths: sorted
        .slice(1)
        .map((fact) => fact.portablePath)
        .sort((left, right) => left.localeCompare(right, "en")),
      sha256: canonical.sha256,
      fileSize: canonical.fileSize,
      metadata: canonical.metadata,
      provenance: classification.provenance,
      documentType: classification.documentType,
      ...(classification.edition
        ? { edition: classification.edition }
        : {}),
      ...(classification.paper ? { paper: classification.paper } : {}),
      reviewStatus: "needs_review" as const,
      audit,
    };
  });

  const ids = new Set<string>();
  for (const source of sources) {
    if (ids.has(source.id)) {
      throw new Error(`Duplicate stable source ID: ${source.id}`);
    }
    ids.add(source.id);
  }

  return sources.sort((left, right) => left.id.localeCompare(right.id, "en"));
}
