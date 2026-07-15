import { describe, expect, it } from "vitest";
import { normalizeMineruContentList } from "../../../src/content/imports/mineru-normalizer.js";
import { verifyNormalizedImportedDocument } from "../../../src/content/imports/verify.js";

const digest = "a".repeat(64);

describe("MinerU content import normalization", () => {
  it("converts provider output into stable source-linked blocks", () => {
    const document = normalizeMineruContentList({
      sourceId: "tmua-2022-paper-1",
      sourceSha256: digest,
      providerVersion: "3.4.0",
      backend: "hybrid",
      parsedAt: "2026-07-15T08:00:00.000Z",
      contentList: [
        [
          {
            type: "page_header",
            content: { paragraph_content: [{ type: "text", content: "TMUA" }] },
            bbox: [0, 0, 1000, 20],
          },
          {
            type: "title",
            content: { title_content: [{ type: "text", content: "Question 1" }], level: 1 },
            bbox: [80, 100, 500, 150],
          },
          {
            type: "paragraph",
            content: {
              paragraph_content: [
                { type: "text", content: "Find the value of" },
                { type: "equation_inline", content: "x^2" },
              ],
            },
            bbox: [80, 170, 900, 260],
          },
          {
            type: "equation_interline",
            content: { math_content: "x = 4" },
            bbox: [300, 280, 700, 340],
          },
          {
            type: "image",
            content: { image_path: "images/q1.png", image_caption: [{ type: "text", content: "Figure 1" }] },
            bbox: [100, 360, 900, 800],
          },
        ],
      ],
    });

    expect(document).toMatchObject({
      schemaVersion: 1,
      reviewStatus: "needs_review",
      publishable: false,
      parserRun: { provider: "mineru", providerVersion: "3.4.0", backend: "hybrid" },
    });
    expect(document.blocks.map((block) => block.kind)).toEqual([
      "title",
      "text",
      "equation",
      "image",
    ]);
    expect(document.blocks[1]?.text).toBe("Find the value of x^2");
    expect(document.blocks[2]?.text).toBe("x = 4");
    expect(document.blocks[3]).toMatchObject({
      assetPath: "images/q1.png",
      bbox: { x0: 100, y0: 360, x1: 900, y1: 800 },
    });
    expect(verifyNormalizedImportedDocument(document)).toEqual([]);
  });

  it("keeps unsupported or malformed provider blocks visible for review", () => {
    const document = normalizeMineruContentList({
      sourceId: "tmua-notes",
      sourceSha256: digest,
      providerVersion: "3.4.0",
      backend: "pipeline",
      parsedAt: "2026-07-15T08:00:00.000Z",
      contentList: [[{ type: "new_provider_type", content: {}, bbox: [10, 10, 5, 5] }]],
    });

    expect(document.blocks[0]?.kind).toBe("other");
    expect(document.warnings).toEqual([
      "page-1-block-1:empty-content",
      "page-1-block-1:invalid-bbox",
      "page-1-block-1:unsupported-type:new_provider_type",
    ]);
    expect(verifyNormalizedImportedDocument(document)).toContainEqual(
      expect.objectContaining({ severity: "P1", code: "content-import-empty-block" }),
    );
  });

  it("rejects invalid source identity before creating an import", () => {
    expect(() =>
      normalizeMineruContentList({
        sourceId: "tmua-paper",
        sourceSha256: "invalid",
        providerVersion: "3.4.0",
        backend: "vlm",
        parsedAt: "2026-07-15T08:00:00.000Z",
        contentList: [],
      }),
    ).toThrow(/SHA-256/u);
  });
});
