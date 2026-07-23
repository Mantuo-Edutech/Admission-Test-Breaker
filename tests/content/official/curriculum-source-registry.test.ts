import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  PREPARATION_CATALOG,
  qualificationById,
} from "../../../src/features/preparation-profile/catalog.js";

interface CurriculumSource {
  id: string;
  curriculumSystem: "ib" | "ap";
  sourceRegistryId: "ibo" | "college-board";
  qualificationIds: string[];
  specificationVersion: string;
  officialUrl: string;
  format: "pdf";
  sourceVerified: boolean;
  lastVerifiedAt: string;
  retrievalStatus: "downloaded" | "blocked_by_origin";
  retrievalNote: string;
  localPath: string | null;
  bytes: number | null;
  sha256: string | null;
  rightsStatus: "internal_research_only";
  publishable: boolean;
  supportsMappingVersion: string;
}

interface CurriculumSourceRegistry {
  schemaVersion: number;
  lastVerifiedAt: string;
  mappingVersion: string;
  policy: {
    rawFilesInPublicBundle: boolean;
    rawFilesTrackedByGit: boolean;
    downloadDoesNotGrantRepublicationRights: boolean;
    blockedDownloadsMayBeRepresentedAsLocalAssets: boolean;
  };
  sources: CurriculumSource[];
}

const registryPath = "content/official/curriculum-source-registry.json";

async function loadRegistry(): Promise<CurriculumSourceRegistry> {
  return JSON.parse(await readFile(registryPath, "utf8")) as CurriculumSourceRegistry;
}

describe("official curriculum source registry", () => {
  it("covers every configured IB and AP qualification with its current official source", async () => {
    const registry = await loadRegistry();
    const expectedQualificationIds = PREPARATION_CATALOG
      .filter((qualification) => qualification.system === "ib" || qualification.system === "ap")
      .map((qualification) => qualification.id)
      .sort();

    expect(registry).toMatchObject({
      schemaVersion: 1,
      lastVerifiedAt: "2026-07-19",
      mappingVersion: "2026-07-19.2",
      policy: {
        rawFilesInPublicBundle: false,
        rawFilesTrackedByGit: false,
        downloadDoesNotGrantRepublicationRights: true,
        blockedDownloadsMayBeRepresentedAsLocalAssets: false,
      },
    });
    expect(registry.sources.map((source) => source.id)).toEqual([
      "ibo-mathematics-aa-subject-brief-2021",
      "ibo-mathematics-ai-subject-brief-2021",
      "college-board-ap-precalculus-ced-fall-2026",
      "college-board-ap-calculus-ab-bc-ced",
    ]);
    expect(registry.sources.flatMap((source) => source.qualificationIds).sort()).toEqual(
      expectedQualificationIds,
    );

    for (const source of registry.sources) {
      const url = new URL(source.officialUrl);
      expect(["ibo.org", "www.ibo.org", "apcentral.collegeboard.org"]).toContain(url.hostname);
      expect(url.protocol).toBe("https:");
      expect(source).toMatchObject({
        format: "pdf",
        sourceVerified: true,
        lastVerifiedAt: "2026-07-19",
        rightsStatus: "internal_research_only",
        publishable: false,
        supportsMappingVersion: registry.mappingVersion,
      });

      for (const qualificationId of source.qualificationIds) {
        expect(qualificationById(qualificationId)).toMatchObject({
          system: source.curriculumSystem,
          sourceRegistryId: source.sourceRegistryId,
          sourceDocument: source.officialUrl,
          specificationVersion: source.specificationVersion,
        });
      }
    }
  });

  it("never invents a local file for an origin-blocked document", async () => {
    const registry = await loadRegistry();
    const blocked = registry.sources.filter(
      (source) => source.retrievalStatus === "blocked_by_origin",
    );

    expect(blocked).toHaveLength(2);
    for (const source of blocked) {
      expect(source.retrievalNote.length).toBeGreaterThan(20);
      expect(source.localPath).toBeNull();
      expect(source.bytes).toBeNull();
      expect(source.sha256).toBeNull();
    }
  });

  it("verifies every downloaded local PDF when the internal raw asset is present", async () => {
    const registry = await loadRegistry();
    const requireAllRaw = process.env.REQUIRE_CURRICULUM_RAW === "1";
    const downloaded = registry.sources.filter(
      (source) => source.retrievalStatus === "downloaded",
    );

    expect(downloaded).toHaveLength(2);
    for (const source of downloaded) {
      expect(source.localPath).toMatch(/^content\/official\/raw\/curricula\/.+\.pdf$/u);
      expect(source.bytes).toBeGreaterThan(0);
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/u);

      let file: Buffer;
      try {
        file = await readFile(source.localPath!);
      } catch (error) {
        if (!requireAllRaw && (error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }

      expect(file.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(file.byteLength).toBe(source.bytes);
      expect(createHash("sha256").update(file).digest("hex")).toBe(source.sha256);
    }
  });
});
