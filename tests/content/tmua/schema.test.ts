import { readFile } from "node:fs/promises";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { describe, expect, it } from "vitest";

const Ajv2020 = Ajv2020Module.default;
const addFormats = addFormatsModule.default;

const schemaFiles = ["source", "paper", "question", "taxonomy"] as const;

const sourceFixture = {
  id: "tmua-official-2023-paper-1",
  canonicalPath: "Tmua/2016-2023paper/tmua-paper-1-2023.pdf",
  duplicatePaths: [],
  sha256: "a".repeat(64),
  fileSize: 1,
  metadata: { pages: 24 },
  provenance: "official_source",
  documentType: "question_paper",
  reviewStatus: "verified",
  audit: {
    generatedAt: "2026-07-13T00:00:00.000Z",
    generatedBy: "tmua-corpus-cli",
    schemaVersion: 1,
    changeReason: "test fixture",
  },
};

describe("TMUA JSON Schemas", () => {
  it.each(schemaFiles)("compiles %s.schema.json", async (name) => {
    const text = await readFile(`content/tmua/schemas/${name}.schema.json`, "utf8");
    const schema = JSON.parse(text);
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);
    expect(() => ajv.compile(schema)).not.toThrow();
  });

  it.each(["", "../escape.pdf", "/private/a.pdf", "C:\\private.pdf", "Tmua\\paper.pdf"])(
    "rejects unsafe canonical path %j",
    async (canonicalPath) => {
      const schema = JSON.parse(
        await readFile("content/tmua/schemas/source.schema.json", "utf8"),
      );
      const ajv = new Ajv2020({ allErrors: true });
      addFormats(ajv);
      const validate = ajv.compile(schema);
      expect(validate({ ...sourceFixture, canonicalPath })).toBe(false);
    },
  );
});
