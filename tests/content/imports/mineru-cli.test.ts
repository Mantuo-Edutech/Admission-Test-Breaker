import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeMineruFile } from "../../../src/content/imports/mineru-cli.js";
import type { NormalizedImportedDocument } from "../../../src/content/imports/types.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("MinerU normalization CLI", () => {
  it("writes a review-only normalized document without running a cloud parser", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mineru-normalize-"));
    temporaryDirectories.push(directory);
    await writeFile(
      join(directory, "content_list_v2.json"),
      JSON.stringify([[{ type: "paragraph", content: { paragraph_content: [{ type: "text", content: "Question text" }] }, bbox: [10, 20, 900, 200] }]]),
      "utf8",
    );

    const summary = await normalizeMineruFile(
      [
        "--input", "content_list_v2.json",
        "--output", "normalized/document.json",
        "--source-id", "tmua-test-paper",
        "--source-sha256", "b".repeat(64),
        "--provider-version", "3.4.0",
        "--backend", "hybrid",
        "--parsed-at", "2026-07-15T08:00:00.000Z",
      ],
      directory,
    );

    const document = JSON.parse(
      await readFile(join(directory, "normalized/document.json"), "utf8"),
    ) as NormalizedImportedDocument;
    expect(summary).toContain("Publishable: false");
    expect(document).toMatchObject({ reviewStatus: "needs_review", publishable: false });
    expect(document.blocks).toHaveLength(1);
  });
});
