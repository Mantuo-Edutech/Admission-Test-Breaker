import type { RawPdfFacts } from "./pdf-tools.js";
import type { DocumentType, ProvenanceClass } from "./types.js";

export interface PdfClassification {
  provenance: ProvenanceClass;
  documentType: DocumentType;
  edition?: string;
  paper?: 1 | 2;
}

export class ClassificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClassificationError";
  }
}

const supportedYears = new Set([
  "2017",
  "2018",
  "2019",
  "2020",
  "2021",
  "2022",
  "2023",
]);

function parseEdition(value: string): string | undefined {
  if (/specimen/iu.test(value)) return "specimen";
  if (/practice[^\n/]*2016|practice\(2016\)/iu.test(value)) {
    return "practice-2016";
  }

  const year = value.match(/\b(20\d{2})\b/u)?.[1];
  if (year === undefined) return undefined;
  if (!supportedYears.has(year)) {
    throw new ClassificationError(`Unsupported edition: ${year}`);
  }
  return year;
}

function parsePaper(value: string): 1 | 2 | undefined {
  const paper = value.match(/paper[\s_-]*([12])/iu)?.[1];
  return paper === "1" ? 1 : paper === "2" ? 2 : undefined;
}

function editionFrom(facts: RawPdfFacts): string | undefined {
  const filename = facts.portablePath.split("/").at(-1) ?? facts.portablePath;
  return (
    parseEdition(filename) ??
    parseEdition(facts.metadata.title ?? "") ??
    parseEdition(facts.openingText)
  );
}

function paperFrom(facts: RawPdfFacts): 1 | 2 | undefined {
  return (
    parsePaper(facts.portablePath) ??
    parsePaper(facts.metadata.title ?? "") ??
    parsePaper(facts.openingText)
  );
}

function officialPaperClassification(
  facts: RawPdfFacts,
  documentType: "question_paper" | "worked_solutions",
): PdfClassification {
  const edition = editionFrom(facts);
  const paper = paperFrom(facts);
  if (edition === undefined || paper === undefined) {
    throw new ClassificationError(
      `Could not determine edition and paper for ${facts.portablePath}`,
    );
  }
  return {
    provenance: "official_source",
    documentType,
    edition,
    paper,
  };
}

export function classifyPdf(facts: RawPdfFacts): PdfClassification {
  const path = facts.portablePath.toLowerCase();
  const evidence = [path, facts.metadata.title ?? "", facts.openingText]
    .join("\n")
    .toLowerCase();

  // Audited filename overrides, 2026-07-13. These identify original/compiled
  // teaching assets whose provenance cannot be inferred from PDF text alone.
  if (/\/student textbook(?:\(1\))?\.pdf$/u.test(path)) {
    return {
      provenance: "original_teaching",
      documentType: "teaching_textbook",
    };
  }
  if (/\/student workbook\/student workbook(?:\(1\))?\.pdf$/u.test(path)) {
    return {
      provenance: "original_compilation",
      documentType: "topic_workbook",
    };
  }
  if (/\/student workbook\/tmua workbook answers(?:\(1\))?\.pdf$/u.test(path)) {
    return {
      provenance: "original_compilation",
      documentType: "answer_map",
    };
  }
  if (/\/2016-2021 answer key 集锦(?:\(1\))?\.pdf$/u.test(path)) {
    return {
      provenance: "original_compilation",
      documentType: "answer_map",
    };
  }
  if (/notes-on-logic-and-proof-enhanced-test-specification/iu.test(path)) {
    return {
      provenance: "official_source",
      documentType: "content_specification",
    };
  }

  const answerKeyEvidence = /answer keys?|score conversion/iu.test(evidence);
  const workedEvidence = /worked (?:solutions?|answers?)/iu.test(evidence);

  if (answerKeyEvidence && !workedEvidence) {
    const edition = editionFrom(facts);
    if (edition === undefined) {
      throw new ClassificationError(
        `Could not determine answer-key edition for ${facts.portablePath}`,
      );
    }
    return {
      provenance: "official_source",
      documentType: "answer_key",
      edition,
    };
  }

  if (workedEvidence) {
    return officialPaperClassification(facts, "worked_solutions");
  }

  if (/\/2016-2023paper\//u.test(path) || /\bpaper[\s_-]*[12]\b/iu.test(evidence)) {
    return officialPaperClassification(facts, "question_paper");
  }

  throw new ClassificationError(`Unclassified TMUA PDF: ${facts.portablePath}`);
}
