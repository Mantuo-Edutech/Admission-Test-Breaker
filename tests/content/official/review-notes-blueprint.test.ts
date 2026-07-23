import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface NotesBlueprint {
  schemaVersion: number;
  contentPolicy: Record<string, boolean | string>;
  access: { public: string[]; entitled: string[] };
  qualityGates: string[];
  series: Array<{
    exam: string;
    sourceAssets: string[];
    modules: Array<{ id: string; titleZh: string; titleEn: string; knowledgeUnits: string[] }>;
  }>;
  deliveryOrder: Array<{ sequence: number }>;
}

describe("China-student review notes blueprint", () => {
  it("covers all five exams without treating downloaded official material as publishable content", async () => {
    const blueprint = JSON.parse(
      await readFile("content/notes/china-student-review-notes-blueprint.json", "utf8"),
    ) as NotesBlueprint;

    expect(blueprint.schemaVersion).toBe(1);
    expect(blueprint.series.map((series) => series.exam)).toEqual([
      "TMUA", "ESAT", "TARA", "LNAT", "UCAT",
    ]);
    expect(blueprint.contentPolicy).toMatchObject({
      originalWritingRequired: true,
      officialQuestionsAndExplanationsMayBeRepublishedWithoutClearance: false,
      rawOfficialAssetsMayEnterPublicBundle: false,
      liveAiRequiredForBaseNotes: false,
    });
    expect(blueprint.access.public).toContain("sample_chapter");
    expect(blueprint.access.entitled).toContain("complete_notes");
    expect(blueprint.qualityGates).toContain("rights_and_similarity_review");
    expect(blueprint.series.every((series) =>
      series.modules.length > 0 &&
      series.sourceAssets.every((asset) => asset.startsWith("content/official/raw/")) &&
      series.modules.every((module) =>
        module.titleZh.length > 0 && module.titleEn.length > 0 && module.knowledgeUnits.length > 0,
      ),
    )).toBe(true);
    expect(blueprint.deliveryOrder.map((item) => item.sequence)).toEqual([1, 2, 3, 4, 5]);
  });
});
