import { readFile } from "node:fs/promises";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { describe, expect, it } from "vitest";
import { normalizeMineruContentList } from "../../../src/content/imports/mineru-normalizer.js";

const Ajv2020 = Ajv2020Module.default;
const addFormats = addFormatsModule.default;

describe("normalized document JSON Schema", () => {
  it("accepts normalizer output and rejects a publishable parser result", async () => {
    const schema = JSON.parse(
      await readFile("content/imports/schemas/normalized-document.schema.json", "utf8"),
    );
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const document = normalizeMineruContentList({
      sourceId: "tmua-schema-fixture",
      sourceSha256: "c".repeat(64),
      providerVersion: "3.4.0",
      backend: "hybrid",
      parsedAt: "2026-07-15T08:00:00.000Z",
      contentList: [[{ type: "paragraph", content: { paragraph_content: "Text" } }]],
    });

    expect(validate(document)).toBe(true);
    expect(validate({ ...document, publishable: true })).toBe(false);
  });
});
