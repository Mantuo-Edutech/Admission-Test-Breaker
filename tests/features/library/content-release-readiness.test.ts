import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { ContentReleaseReadinessReport } from "../../../src/features/library/content-release-readiness.js";
import { assessProductReleaseReadiness } from "../../../src/features/library/content-release-readiness.js";
import catalog from "../../../content/products/catalog.json" with { type: "json" };

async function report(): Promise<ContentReleaseReadinessReport> {
  return JSON.parse(
    await readFile("content/products/release-readiness.json", "utf8"),
  ) as ContentReleaseReadinessReport;
}

describe("standardized content release readiness", () => {
  it("tracks every catalog product exactly once against the current revision", async () => {
    const value = await report();
    expect(value.schemaVersion).toBe(1);
    expect(value.policyVersion).toBe("1.0.0");
    expect(value.catalogRevision).toBe(catalog.revision);
    expect(value.products.map((product) => product.productId)).toEqual(
      catalog.products.map((product) => product.id),
    );
    expect(new Set(value.products.map((product) => product.productId)).size).toBe(
      catalog.products.length,
    );
  });

  it("does not mistake automated coverage for closed-Beta or final review", async () => {
    const value = await report();
    expect(value.summary).toMatchObject({
      totalProducts: 41,
      publicProducts: 40,
      internalProducts: 1,
      automatedReadyProducts: 40,
    });
    expect(value.summary.manualReadyProducts).toBeLessThan(value.summary.publicProducts);
    expect(value.summary.closedBetaReadyProducts).toBeLessThan(value.summary.publicProducts);
    expect(value.summary.finalPublicationReadyProducts).toBeLessThanOrEqual(
      value.summary.closedBetaReadyProducts,
    );
    expect(
      value.products
        .filter((product) => product.visibility === "public")
        .every((product) => product.featureManifest?.startsWith("verification/features/") === true),
    ).toBe(true);
  });

  it("records concrete manual blockers instead of a vague incomplete state", async () => {
    const value = await report();
    const tmuaPapers = value.products.find((product) => product.productId === "tmua-online-past-papers");
    const ucatNotes = value.products.find((product) => product.productId === "ucat-review-notes-v1");
    const internalBlueprint = value.products.find((product) => product.productId === "esat-review-notes-v1");

    expect(tmuaPapers?.closedBetaBlockers).toContain(
      "pending-manual-check:native-and-migration-responsive-review",
    );
    expect(ucatNotes?.closedBetaBlockers).toContain(
      "pending-manual-check:independent-ucat-medical-bilingual-and-rights-review",
    );
    expect(ucatNotes?.finalPublicationBlockers).toContain("catalog-status:teaching-preview");
    expect(internalBlueprint?.closedBetaBlockers).toContain("internal-product");
    expect(internalBlueprint?.closedBetaReady).toBe(false);
  });

  it("accepts a manual check only through explicit inline evidence or a current decision", () => {
    const manifestPath = "verification/features/example.yaml";
    const product = {
      id: "example-product",
      examId: "tmua",
      kind: "practice-library",
      status: "published" as const,
      visibility: "public" as const,
      route: "/example",
      evidence: [manifestPath],
    };
    const manifests = new Map([[manifestPath, {
      path: manifestPath,
      featureId: "example-feature",
      featureStatus: "verified" as const,
      claims: [{ id: "automated", status: "verified" as const }],
      manualChecks: [{ id: "human-review", status: "pending" as const }],
    }]]);

    expect(assessProductReleaseReadiness(product, manifests).closedBetaReady).toBe(false);
    const approved = assessProductReleaseReadiness(product, manifests, new Map([[
      "example-feature/human-review",
      {
        decisionId: "decision-01",
        decisionFile: "verification/reviews/decisions/decision-01.json",
        reviewedAt: "2026-07-19",
        reviewerRole: "content-review-lead",
        evidenceSummary: "Independent evidence is complete.",
      },
    ]]));
    expect(approved.closedBetaReady).toBe(true);
    expect(approved.manualApprovals).toEqual([expect.objectContaining({
      id: "human-review",
      source: "review-decision",
      decisionId: "decision-01",
    })]);
  });
});
