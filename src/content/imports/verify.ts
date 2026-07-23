import type {
  ContentImportValidationIssue,
  NormalizedImportedDocument,
} from "./types.js";

export function verifyNormalizedImportedDocument(
  document: NormalizedImportedDocument,
): ContentImportValidationIssue[] {
  const issues: ContentImportValidationIssue[] = [];
  if (document.reviewStatus !== "needs_review" || document.publishable !== false) {
    issues.push({
      severity: "P0",
      code: "content-import-review-boundary",
      message: "Parsed documents must remain non-publishable until review",
    });
  }
  if (document.blocks.length === 0) {
    issues.push({
      severity: "P0",
      code: "content-import-empty",
      message: "Parsed document contains no content blocks",
    });
  }

  const ids = new Set<string>();
  for (const block of document.blocks) {
    if (ids.has(block.id)) {
      issues.push({
        severity: "P0",
        code: "content-import-duplicate-block",
        message: `Duplicate block ID ${block.id}`,
        path: block.id,
      });
    }
    ids.add(block.id);
    if (block.text === null && block.assetPath === null) {
      issues.push({
        severity: "P1",
        code: "content-import-empty-block",
        message: `${block.id} has neither text nor an asset`,
        path: block.id,
      });
    }
  }
  return issues;
}
