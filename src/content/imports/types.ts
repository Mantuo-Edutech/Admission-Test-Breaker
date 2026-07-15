export type DocumentBlockKind =
  | "title"
  | "text"
  | "equation"
  | "image"
  | "table"
  | "chart"
  | "list"
  | "code"
  | "other";

export interface DocumentBoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface NormalizedDocumentBlock {
  id: string;
  page: number;
  order: number;
  kind: DocumentBlockKind;
  rawType: string;
  bbox: DocumentBoundingBox | null;
  text: string | null;
  assetPath: string | null;
}

export interface NormalizedImportedDocument {
  schemaVersion: 1;
  id: string;
  source: {
    sourceId: string;
    sha256: string;
  };
  parserRun: {
    provider: "mineru";
    providerVersion: string;
    backend: "pipeline" | "vlm" | "hybrid";
    parsedAt: string;
  };
  reviewStatus: "needs_review";
  publishable: false;
  blocks: NormalizedDocumentBlock[];
  warnings: string[];
}

export interface ContentImportValidationIssue {
  severity: "P0" | "P1";
  code: string;
  message: string;
  path?: string;
}
