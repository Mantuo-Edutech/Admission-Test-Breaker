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

export const contentStages = [
  "discovered",
  "indexed",
  "extracted",
  "verified",
  "published",
] as const;
export type ContentStage = (typeof contentStages)[number];

export type OfficialAvailability = "linked" | "downloaded";

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

export interface OfficialResourceRecord {
  id: string;
  edition: string;
  paper: 1 | 2;
  documentType: "worked_solutions";
  officialUrl: string;
  expectedPages: number;
  availability: OfficialAvailability;
  localPath?: string;
  sha256?: string;
  retrievedAt?: string;
  reviewStatus: ReviewStatus;
  audit: AuditStamp;
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
  contentStage: ContentStage;
  onlineQuestionCount: number;
  audit: AuditStamp;
}

export interface QuestionRecord {
  id: string;
  exam: "TMUA";
  edition: string;
  paper: 1 | 2;
  questionNumber: number;
  sourceType: "past_paper";
  questionSourceId: string;
  answerSourceId: string;
  workedSolutionSourceId: string;
  prompt: null;
  options: [];
  correctAnswer: null;
  onlineContentId?: string;
  knowledgeTags: string[];
  skillTags: string[];
  errorTypes: string[];
  syllabusLevel: SyllabusLevel;
  contentStage: ContentStage;
  reviewStatus: ReviewStatus;
  audit: AuditStamp;
}

export interface QuestionSourceReference {
  role: "question" | "answer_key" | "worked_solution";
  sourceId: string;
  portablePath: string;
  sha256: string;
  pages: number[];
}

export interface ExtractedQuestionOption {
  label: string;
  rawText: string;
}

export interface QuestionRevisionDraft {
  schemaVersion: 1;
  id: string;
  revision: 1;
  exam: "TMUA";
  paperId: string;
  edition: string;
  paper: 1 | 2;
  questionNumber: number;
  sourceType: "past_paper";
  contentStage: "extracted";
  reviewStatus: "needs_review";
  sourcePage: {
    format: "pdf-layout-text";
    rawText: string;
  };
  stem: {
    format: "pdf-layout-text";
    rawText: string;
  };
  options: ExtractedQuestionOption[];
  correctAnswer: string;
  solution: {
    format: "pdf-layout-text";
    rawText: string;
  };
  sourceRefs: QuestionSourceReference[];
  knowledgeTags: string[];
  skillTags: string[];
  errorTypes: string[];
  extraction: {
    generatedAt: string;
    generatedBy: "tmua-extraction-cli";
    method: "poppler-layout-text";
    mathFidelity: "needs_review";
    warnings: string[];
  };
}

export interface QuestionImportBundle {
  schemaVersion: 1;
  bundleType: "question-import";
  id: string;
  exam: "TMUA";
  paperId: string;
  edition: string;
  paper: 1 | 2;
  generatedAt: string;
  generatedBy: "tmua-extraction-cli";
  sourceDocumentIds: {
    question: string;
    answerKey: string;
    workedSolution: string;
  };
  questionCount: number;
  publishableQuestionCount: 0;
  questions: QuestionRevisionDraft[];
}

export interface TmuaPublicSummary {
  schemaVersion: 1;
  exam: "TMUA";
  auditedAt: string;
  importedPdfPathCount: number;
  canonicalSourceCount: number;
  officialSupplementCount: number;
  paperCount: number;
  questionShellCount: number;
  publishedQuestionCount: number;
  editions: Array<{
    id: string;
    label: string;
    papers: Array<{
      paper: 1 | 2;
      contentStage: ContentStage;
      onlineQuestionCount: number;
    }>;
  }>;
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
