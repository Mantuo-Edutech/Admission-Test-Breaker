import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface OfficialSource {
  id: string;
  exam: "shared" | "tmua" | "esat" | "tara" | "ucat" | "lnat";
  url: string;
  delivery: "link_only" | "external_interactive";
  rightsStatus: "link_only" | "permission_required_for_commercial_republication";
}

interface OfficialSourceRegistry {
  schemaVersion: number;
  verifiedAt: string;
  publicationPolicy: {
    defaultDelivery: string;
  };
  sources: OfficialSource[];
}

async function loadRegistry(): Promise<OfficialSourceRegistry> {
  const raw = await readFile(
    path.resolve("content/official/exam-source-registry.json"),
    "utf8",
  );
  return JSON.parse(raw) as OfficialSourceRegistry;
}

describe("official exam source registry", () => {
  it("stores a versioned, unique, HTTPS provenance record for all five exams", async () => {
    const registry = await loadRegistry();
    expect(registry.schemaVersion).toBe(1);
    expect(registry.verifiedAt).toBe("2026-07-19");
    expect(registry.sources).toHaveLength(19);
    expect(new Set(registry.sources.map((source) => source.id)).size).toBe(19);
    expect(new Set(registry.sources.map((source) => source.exam))).toEqual(
      new Set(["shared", "tmua", "esat", "tara", "ucat", "lnat"]),
    );
    expect(registry.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
  });

  it("keeps official documents out of the public-copy delivery mode", async () => {
    const registry = await loadRegistry();
    expect(registry.publicationPolicy.defaultDelivery).toBe("link_only");
    expect(
      registry.sources.every(
        (source) =>
          source.delivery === "link_only" || source.delivery === "external_interactive",
      ),
    ).toBe(true);
    expect(
      registry.sources.every(
        (source) =>
          source.rightsStatus === "link_only" ||
          source.rightsStatus === "permission_required_for_commercial_republication",
      ),
    ).toBe(true);
  });
});
