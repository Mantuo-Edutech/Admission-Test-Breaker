import { readFile } from "node:fs/promises";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { describe, expect, it } from "vitest";

const Ajv2020 = Ajv2020Module.default;
const addFormats = addFormatsModule.default;

const schemaFiles = [
  "source",
  "official-resource",
  "paper",
  "question",
  "public-summary",
  "taxonomy",
] as const;

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

const unsafeSourcePaths = [
  "",
  "../escape.pdf",
  "/private/a.pdf",
  "C:\\private.pdf",
  "Tmua\\paper.pdf",
] as const;

const unsafeSourcePathCases = (["canonicalPath", "duplicatePaths"] as const).flatMap(
  (property) => unsafeSourcePaths.map((path) => [property, path] as const),
);

describe("TMUA JSON Schemas", () => {
  it.each(schemaFiles)("compiles %s.schema.json", async (name) => {
    const text = await readFile(`content/tmua/schemas/${name}.schema.json`, "utf8");
    const schema = JSON.parse(text);
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);
    expect(() => ajv.compile(schema)).not.toThrow();
  });

  it("accepts the valid source fixture", async () => {
    const schema = JSON.parse(
      await readFile("content/tmua/schemas/source.schema.json", "utf8"),
    );
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    expect(validate(sourceFixture)).toBe(true);
  });

  it.each(unsafeSourcePathCases)(
    "rejects unsafe %s value %j",
    async (property, path) => {
      const schema = JSON.parse(
        await readFile("content/tmua/schemas/source.schema.json", "utf8"),
      );
      const ajv = new Ajv2020({ allErrors: true });
      addFormats(ajv);
      const validate = ajv.compile(schema);
      const source =
        property === "canonicalPath"
          ? { ...sourceFixture, canonicalPath: path }
          : { ...sourceFixture, duplicatePaths: [path] };
      expect(validate(source)).toBe(false);
    },
  );
});
