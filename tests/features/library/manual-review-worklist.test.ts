import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { ContentReleaseReadinessReport } from "../../../src/features/library/content-release-readiness.js";
import type { ManualReviewWorklist } from "../../../src/features/library/manual-review-worklist.js";
import catalog from "../../../content/products/catalog.json" with { type: "json" };

async function loadJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("manual product review worklist", () => {
  it("covers every pending public-product check exactly once per feature", async () => {
    const report = await loadJson<ContentReleaseReadinessReport>(
      "content/products/release-readiness.json",
    );
    const worklist = await loadJson<ManualReviewWorklist>(
      "content/products/manual-review-worklist.json",
    );
    const expectedKeys = new Set(
      report.products
        .filter((product) => product.visibility === "public")
        .flatMap((product) => product.pendingManualChecks.map((check) =>
          `${product.featureId}/${check.id}`)),
    );
    const items = worklist.campaigns.flatMap((campaign) => campaign.items);

    expect(worklist.catalogRevision).toBe(catalog.revision);
    expect(items.map((item) => item.reviewKey).sort()).toEqual([...expectedKeys].sort());
    expect(new Set(items.map((item) => item.reviewKey)).size).toBe(items.length);
    expect(worklist.summary).toMatchObject({
      pendingReviewItems: 68,
      affectedPublicProducts: 40,
      academicContentItems: 25,
      studentCalibrationItems: 12,
      deviceAccessibilityItems: 31,
    });
  });

  it("turns shared feature checks into one review with every affected product route", async () => {
    const worklist = await loadJson<ManualReviewWorklist>(
      "content/products/manual-review-worklist.json",
    );
    const items = worklist.campaigns.flatMap((campaign) => campaign.items);
    const esatPlanner = items.find((item) =>
      item.reviewKey === "esat-course-module-planner/esat-planner-responsive-review");
    const writing = items.find((item) =>
      item.reviewKey === "tara-lnat-writing-practice/browser-device-review");

    expect(esatPlanner?.products.map((product) => product.productId)).toEqual([
      "esat-course-coverage",
      "esat-course-module-planner",
    ]);
    expect(writing?.products.map((product) => product.productId)).toEqual([
      "lnat-section-b-writing-v1",
      "tara-writing-task-v1",
    ]);
  });

  it("assigns a role, evidence requirement and current product version to every item", async () => {
    const worklist = await loadJson<ManualReviewWorklist>(
      "content/products/manual-review-worklist.json",
    );
    const items = worklist.campaigns.flatMap((campaign) => campaign.items);

    for (const item of items) {
      expect(item.ownerRole).not.toBe("");
      expect(item.evidenceRequirement).not.toBe("");
      expect(item.products.length).toBeGreaterThan(0);
      expect(item.products.every((product) =>
        product.route.startsWith("/") && product.version.length > 0)).toBe(true);
      expect(item.sourceFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(item.sourceArtifactCount).toBeGreaterThan(0);
    }
  });
});
