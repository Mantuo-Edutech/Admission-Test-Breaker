import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface ResearchInventory {
  schemaVersion: number;
  policy: {
    rawFilesInPublicBundle: boolean;
    rawFilesTrackedByGit: boolean;
    downloadDoesNotGrantRepublicationRights: boolean;
  };
  summary: {
    sourcePages: number;
    discoveredDownloads: number;
    downloaded: number;
    failed: number;
    byExam: Record<string, number>;
  };
  sourcePages: Array<{ url: string; localPath: string; publishable: boolean }>;
  assets: Array<{
    id: string;
    exam: string;
    url: string;
    localPath: string;
    publishable: boolean;
    downloadStatus: string;
    sha256: string | null;
  }>;
  interactiveResources: Array<{ localDownload: boolean; delivery: string }>;
}

describe("official research asset inventory", () => {
  it("records a complete internal-only research snapshot without exposing raw files", async () => {
    const inventory = JSON.parse(
      await readFile("content/official/research-asset-inventory.json", "utf8"),
    ) as ResearchInventory;

    expect(inventory.schemaVersion).toBe(1);
    expect(inventory.policy).toMatchObject({
      rawFilesInPublicBundle: false,
      rawFilesTrackedByGit: false,
      downloadDoesNotGrantRepublicationRights: true,
    });
    expect(inventory.summary.sourcePages).toBeGreaterThanOrEqual(20);
    expect(inventory.summary.downloaded).toBe(inventory.summary.discoveredDownloads);
    expect(inventory.summary.failed).toBe(0);
    expect(Object.keys(inventory.summary.byExam).sort()).toEqual([
      "esat", "lnat", "shared", "tara", "tmua", "ucat",
    ]);
    expect(inventory.sourcePages.every((page) => page.url.startsWith("https://"))).toBe(true);
    expect(inventory.sourcePages.every((page) => page.localPath.startsWith("content/official/raw/") && !page.publishable)).toBe(true);
    expect(inventory.assets.every((asset) =>
      asset.url.startsWith("https://") &&
      asset.localPath.startsWith("content/official/raw/") &&
      !asset.publishable &&
      asset.downloadStatus === "downloaded" &&
      /^[a-f0-9]{64}$/u.test(asset.sha256 ?? ""),
    )).toBe(true);
    expect(new Set(inventory.assets.map((asset) => asset.id)).size).toBe(inventory.assets.length);
    expect(inventory.interactiveResources.every((resource) =>
      !resource.localDownload && resource.delivery === "external_interactive_only",
    )).toBe(true);
  });
});
