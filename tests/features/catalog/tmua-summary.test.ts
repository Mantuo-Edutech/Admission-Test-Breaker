import { describe, expect, it } from "vitest";
import {
  parseTmuaPublicSummary,
  TMUA_PUBLIC_SUMMARY,
} from "../../../src/features/catalog/tmua-summary.js";

function mutableSummary(): Record<string, unknown> {
  return structuredClone(TMUA_PUBLIC_SUMMARY) as unknown as Record<string, unknown>;
}

describe("TMUA public summary runtime boundary", () => {
  it("accepts the generated complete-corpus summary", () => {
    expect(TMUA_PUBLIC_SUMMARY).toMatchObject({
      schemaVersion: 1,
      exam: "TMUA",
      paperCount: 18,
      questionShellCount: 360,
      publishedQuestionCount: 360,
    });
    expect(TMUA_PUBLIC_SUMMARY.editions).toHaveLength(9);
    expect(TMUA_PUBLIC_SUMMARY.editions.flatMap((edition) => edition.papers)).toHaveLength(18);
  });

  it.each([
    ["schemaVersion", 2],
    ["exam", "ESAT"],
    ["paperCount", 16],
    ["questionShellCount", 320],
  ])("rejects an invalid %s", (field, value) => {
    const candidate = mutableSummary();
    candidate[field] = value;
    expect(() => parseTmuaPublicSummary(candidate)).toThrow();
  });

  it("rejects an unsupported content stage", () => {
    const candidate = mutableSummary();
    const editions = candidate.editions as Array<{
      papers: Array<{ contentStage: string }>;
    }>;
    editions[0]!.papers[0]!.contentStage = "draft";
    expect(() => parseTmuaPublicSummary(candidate)).toThrow(/contentStage/u);
  });

  it("rejects a published count that disagrees with edition totals", () => {
    const candidate = mutableSummary();
    candidate.publishedQuestionCount = 19;
    expect(() => parseTmuaPublicSummary(candidate)).toThrow(/publishedQuestionCount/u);
  });
});
