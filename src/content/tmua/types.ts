export const provenanceClasses = [
  "original_teaching",
  "original_compilation",
  "official_source",
  "licensed_external",
] as const;
export type ProvenanceClass = (typeof provenanceClasses)[number];

export const documentTypes = [
  "teaching_textbook",
  "topic_workbook",
  "answer_map",
  "question_paper",
  "answer_key",
  "worked_solutions",
  "content_specification",
  "official_notes",
  "link_only",
] as const;
export type DocumentType = (typeof documentTypes)[number];

export type ReviewStatus =
  | "not_started"
  | "auto_extracted"
  | "needs_review"
  | "verified"
  | "rejected";

export type SyllabusLevel = "CORE" | "SUPPORT" | "EXTENSION";

export interface AuditStamp {
  generatedAt: string;
  generatedBy: "tmua-corpus-cli";
  schemaVersion: 1;
  changeReason: string;
}

export interface PdfMetadata {
  pages: number;
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
}

export interface SourceRecord {
  id: string;
  canonicalPath: string;
  duplicatePaths: string[];
  sha256: string;
  fileSize: number;
  metadata: PdfMetadata;
  provenance: ProvenanceClass;
  documentType: DocumentType;
  edition?: string;
  paper?: 1 | 2;
  officialUrl?: string;
  retrievedAt?: string;
  reviewStatus: ReviewStatus;
  audit: AuditStamp;
}

export interface CorpusManifest {
  schemaVersion: 1;
  generatedAt: string;
  baseline: { pdfCount: 96; uniqueContentCount: 46; auditedAt: "2026-07-12" };
  sources: SourceRecord[];
}

export interface PaperRecord {
  id: string;
  edition: string;
  paper: 1 | 2;
  durationMinutes: 75;
  expectedQuestionCount: 20;
  questionSourceId: string;
  answerSourceId: string;
  workedSolutionSourceId: string;
  completeness: "complete" | "incomplete";
  audit: AuditStamp;
}

export interface QuestionRecord {
  id: string;
  exam: "TMUA";
  edition: string;
  paper: 1 | 2;
  questionNumber: number;
  knowledgeTags: string[];
  skillTags: string[];
  errorTypes: string[];
  syllabusLevel: SyllabusLevel;
  reviewStatus: ReviewStatus;
  audit: AuditStamp;
}

export interface TaxonomyNode {
  id: string;
  name: string;
  parentId: string | null;
  level: SyllabusLevel;
  specificationRefs: string[];
  prerequisites: string[];
  aliases: string[];
}

export interface ValidationIssue {
  severity: "P0" | "P1" | "P2";
  code: string;
  message: string;
  path?: string;
}
