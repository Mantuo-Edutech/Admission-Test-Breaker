import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  ESAT_ADVANCED_NOTES_RESOURCE_ID,
  parseAdvancedReviewNotes,
  TARA_ADVANCED_NOTES_RESOURCE_ID,
} from "../../../src/features/entitled-content/advanced-review-notes.js";
import { parseEntitledContentPayload } from "../../../src/features/entitled-content/domain.js";

const fixtures = [
  {
    path: "content/notes/esat/advanced-review-notes-v1.json",
    id: ESAT_ADVANCED_NOTES_RESOURCE_ID,
    digest: "712c01035493a53129688445be09b66d9e96925e22f3c030e0ad8ac52f3eb448",
    moduleIds: ["mathematics-1", "mathematics-2", "physics", "chemistry", "biology"],
  },
  {
    path: "content/notes/tara/advanced-review-notes-v1.json",
    id: TARA_ADVANCED_NOTES_RESOURCE_ID,
    digest: "e5e822e578a65c96977ccbacf9c21f41ff96810484d37b5b89d0f0a912e54a9e",
    moduleIds: ["tara-critical-thinking", "tara-problem-solving", "tara-writing-task", "tara-language-bridge"],
  },
] as const;

describe("ESAT and TARA private advanced review notes", () => {
  it.each(fixtures)("parses a complete English-first product: $id", async (fixture) => {
    const raw = await readFile(fixture.path, "utf8");
    const inventory = JSON.parse(
      await readFile("content/official/research-asset-inventory.json", "utf8"),
    ) as { assets: Array<{ localPath?: string; sha256?: string }> };
    const notes = parseAdvancedReviewNotes(JSON.parse(raw));

    expect(notes.id).toBe(fixture.id);
    expect(notes.modules.map((module) => module.id)).toEqual(fixture.moduleIds);
    expect(notes.modules.every((module) => (
      module.playbooks.length >= 2
      && module.workedCase.steps.length === 3
      && module.trainingPrescriptionEn.length === module.trainingPrescriptionZh.length
      && module.trainingPrescriptionEn.length >= 3
    ))).toBe(true);
    expect(notes.reviewProtocol).toHaveLength(4);
    for (const source of notes.sourceAnchors) {
      expect(inventory.assets).toContainEqual(expect.objectContaining({
        localPath: source.localPath,
        sha256: source.sha256,
      }));
    }
    expect(parseEntitledContentPayload(fixture.id, JSON.parse(raw))).toEqual(notes);
  });

  it.each(fixtures)("rejects an incomplete English teaching body: $id", async (fixture) => {
    const payload = JSON.parse(await readFile(fixture.path, "utf8")) as {
      modules: Array<{ playbooks: Array<Record<string, unknown>> }>;
    };
    delete payload.modules[0]!.playbooks[0]!.actionEn;

    expect(() => parseAdvancedReviewNotes(payload)).toThrow(/playbooks\.0\.actionEn/u);
  });

  it("keeps both private database payloads byte-pinned to their canonical assets", async () => {
    const migration = await readFile(
      "supabase/migrations/20260726150000_esat_tara_advanced_notes.sql",
      "utf8",
    );
    for (const fixture of fixtures) {
      const raw = await readFile(fixture.path, "utf8");
      const digest = createHash("sha256").update(raw).digest("hex");
      expect(digest).toBe(fixture.digest);
      expect(migration).toContain(`'${digest}'`);
      expect(migration).toContain(raw.trim());
    }
  });
});
