import { readFile } from "node:fs/promises";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { describe, expect, it } from "vitest";

const Ajv2020 = Ajv2020Module.default;
const addFormats = addFormatsModule.default;

const schemaFiles = ["source", "paper", "question", "taxonomy"] as const;

describe("TMUA JSON Schemas", () => {
  it.each(schemaFiles)("compiles %s.schema.json", async (name) => {
    const text = await readFile(`content/tmua/schemas/${name}.schema.json`, "utf8");
    const schema = JSON.parse(text);
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);
    expect(() => ajv.compile(schema)).not.toThrow();
  });
});
