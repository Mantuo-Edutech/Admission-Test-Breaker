import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyExtractionDirectory } from "../../../src/content/tmua/verify-extractions.js";

describe("committed TMUA extraction staging", () => {
  it("keeps every bundle schema-valid, synchronized and non-publishable", async () => {
    const result = await verifyExtractionDirectory({
      stagingDirectory: resolve("content/tmua/staging"),
      schemaPath: resolve("content/tmua/schemas/question-revision.schema.json"),
    });

    expect(result).toMatchObject({ bundles: 1, questions: 20, issues: [] });
  });
});
