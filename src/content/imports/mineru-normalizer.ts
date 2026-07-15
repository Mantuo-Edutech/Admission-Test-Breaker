import type {
  DocumentBlockKind,
  DocumentBoundingBox,
  NormalizedDocumentBlock,
  NormalizedImportedDocument,
} from "./types.js";

type MineruBackend = NormalizedImportedDocument["parserRun"]["backend"];

interface NormalizeMineruInput {
  sourceId: string;
  sourceSha256: string;
  providerVersion: string;
  backend: MineruBackend;
  parsedAt: string;
  contentList: unknown;
}

const ignoredTypes = new Set([
  "page_header",
  "page_footer",
  "page_number",
  "page_aside_text",
  "page_footnote",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function textFromSpans(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(textFromSpans).filter(Boolean).join(" ").trim();
  }
  if (!isRecord(value)) return "";

  if (typeof value.content === "string") return value.content.trim();
  if (value.children !== undefined) return textFromSpans(value.children);
  return "";
}

function contentValue(
  content: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const text = textFromSpans(content[key]);
    if (text !== "") return text;
  }
  return "";
}

function assetValue(content: Record<string, unknown>): string | null {
  for (const key of ["image_path", "img_path", "asset_path"]) {
    const value = content[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

function blockKind(rawType: string): DocumentBlockKind {
  switch (rawType) {
    case "title":
      return "title";
    case "paragraph":
      return "text";
    case "equation_interline":
      return "equation";
    case "image":
      return "image";
    case "table":
      return "table";
    case "chart":
      return "chart";
    case "list":
    case "index":
      return "list";
    case "code":
    case "algorithm":
      return "code";
    default:
      return "other";
  }
}

function blockText(rawType: string, content: Record<string, unknown>): string | null {
  const keysByType: Readonly<Record<string, readonly string[]>> = {
    title: ["title_content"],
    paragraph: ["paragraph_content"],
    equation_interline: ["math_content"],
    image: ["image_caption", "image_footnote", "content"],
    table: ["table_body", "table_caption", "content"],
    chart: ["content", "chart_caption", "chart_footnote"],
    list: ["list_items"],
    index: ["list_items"],
    code: ["code_content", "code_caption"],
    algorithm: ["algorithm_content", "algorithm_caption"],
  };
  const text = contentValue(content, keysByType[rawType] ?? ["content"]);
  return text === "" ? null : text;
}

function boundingBox(
  value: unknown,
  warningPath: string,
  warnings: string[],
): DocumentBoundingBox | null {
  if (value === undefined) return null;
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    value.some((coordinate) => typeof coordinate !== "number" || !Number.isFinite(coordinate))
  ) {
    warnings.push(`${warningPath}:invalid-bbox`);
    return null;
  }
  const [x0, y0, x1, y1] = value as [number, number, number, number];
  if (x0 < 0 || y0 < 0 || x1 > 1000 || y1 > 1000 || x0 >= x1 || y0 >= y1) {
    warnings.push(`${warningPath}:invalid-bbox`);
    return null;
  }
  return { x0, y0, x1, y1 };
}

function documentId(sourceId: string, providerVersion: string): string {
  const safeVersion = providerVersion.replace(/[^a-zA-Z0-9.-]+/gu, "-");
  return `${sourceId}-mineru-${safeVersion}`;
}

export function normalizeMineruContentList(
  input: NormalizeMineruInput,
): NormalizedImportedDocument {
  const sourceId = requiredString(input.sourceId, "sourceId");
  const providerVersion = requiredString(input.providerVersion, "providerVersion");
  if (!/^[a-f0-9]{64}$/u.test(input.sourceSha256)) {
    throw new Error("sourceSha256 must be a lowercase SHA-256 digest");
  }
  if (Number.isNaN(Date.parse(input.parsedAt))) {
    throw new Error("parsedAt must be an ISO timestamp");
  }
  if (!Array.isArray(input.contentList)) {
    throw new Error("MinerU content_list_v2 must be an array of pages");
  }

  const blocks: NormalizedDocumentBlock[] = [];
  const warnings: string[] = [];

  input.contentList.forEach((pageValue, pageIndex) => {
    if (!Array.isArray(pageValue)) {
      throw new Error(`MinerU page ${pageIndex + 1} must be an array of blocks`);
    }
    pageValue.forEach((blockValue, blockIndex) => {
      const path = `page-${pageIndex + 1}-block-${blockIndex + 1}`;
      if (!isRecord(blockValue)) {
        warnings.push(`${path}:invalid-block`);
        return;
      }
      const rawType = typeof blockValue.type === "string" ? blockValue.type : "unknown";
      if (ignoredTypes.has(rawType)) return;
      const content = isRecord(blockValue.content) ? blockValue.content : {};
      const kind = blockKind(rawType);
      if (kind === "other") warnings.push(`${path}:unsupported-type:${rawType}`);
      const text = blockText(rawType, content);
      const assetPath = assetValue(content);
      if (text === null && assetPath === null) {
        warnings.push(`${path}:empty-content`);
      }
      blocks.push({
        id: `${sourceId}-p${String(pageIndex + 1).padStart(4, "0")}-b${String(blockIndex + 1).padStart(4, "0")}`,
        page: pageIndex + 1,
        order: blockIndex + 1,
        kind,
        rawType,
        bbox: boundingBox(blockValue.bbox, path, warnings),
        text,
        assetPath,
      });
    });
  });

  return {
    schemaVersion: 1,
    id: documentId(sourceId, providerVersion),
    source: { sourceId, sha256: input.sourceSha256 },
    parserRun: {
      provider: "mineru",
      providerVersion,
      backend: input.backend,
      parsedAt: input.parsedAt,
    },
    reviewStatus: "needs_review",
    publishable: false,
    blocks,
    warnings: [...new Set(warnings)].sort(),
  };
}
