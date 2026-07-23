import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXAM_CATALOG } from "../../../src/features/catalog/exams.js";
import {
  CONTENT_PRODUCT_CATALOG,
  internalContentProducts,
  inviteContentProductsForPackages,
  publicContentProducts,
  reviewContentProductsForPractice,
} from "../../../src/features/library/content-product-registry.js";

describe("versioned content product registry", () => {
  it("publishes only usable products with internal routes and existing evidence", async () => {
    const published = publicContentProducts();
    expect(published.length).toBeGreaterThanOrEqual(8);
    expect(published.every((product) => product.route?.startsWith("/") === true)).toBe(true);
    expect(published.every((product) => !product.route?.startsWith("//"))).toBe(true);
    expect(published.every((product) => product.status !== "internal-review")).toBe(true);
    expect(published.every((product) => /^\d+\.\d+\.\d+/u.test(product.version))).toBe(true);
    expect(published.every((product) => /^\d{4}-\d{2}-\d{2}$/u.test(product.lastVerifiedAt))).toBe(true);

    for (const product of CONTENT_PRODUCT_CATALOG.products) {
      for (const evidence of product.evidence) {
        await expect(access(path.resolve(evidence))).resolves.toBeUndefined();
      }
    }
  });

  it("keeps every free native practice product behind the non-contact profile gate", () => {
    const practiceProducts = publicContentProducts().filter(
      (product) => product.kind === "practice-library" && product.delivery === "native-online",
    );

    expect(practiceProducts).toHaveLength(23);
    expect(practiceProducts.every((product) => product.access === "profile")).toBe(true);
    expect(practiceProducts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "tara-critical-thinking-full-mock-v1" }),
      expect.objectContaining({ id: "tara-problem-solving-full-mock-v1" }),
      expect.objectContaining({ id: "lnat-section-a-full-mock-v1" }),
      expect.objectContaining({ id: "ucat-quantitative-reasoning-full-mock-v1" }),
      expect.objectContaining({ id: "ucat-situational-judgement-full-mock-v1" }),
    ]));
  });

  it("publishes a real invite-bound product only after it has a route and delivery evidence", () => {
    expect(internalContentProducts()).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "tmua-six-week-review-plan-v1",
      }),
    ]));
    expect(publicContentProducts()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "tmua-six-week-review-plan-v1",
        status: "published",
        access: "invite",
        packageIds: ["tmua-full-access"],
        route: "/exams/tmua/notes/six-week-plan",
      }),
    ]));
  });

  it("registers the real TMUA deep review and keeps blueprint-only notes internal", () => {
    expect(publicContentProducts("tmua")).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "tmua-specimen-p1-worked-explanations-v1",
        status: "published",
        access: "invite",
        packageIds: ["tmua-deep-review", "tmua-full-access"],
        route: "/practice/tmua-specimen-p1",
      }),
    ]));
    expect(internalContentProducts().map((product) => product.id).sort()).toEqual([
      "esat-review-notes-v1",
    ]);
    expect(publicContentProducts()).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "esat-review-notes-v1" }),
    ]));
    expect(publicContentProducts("esat")).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "esat-mathematics-review-notes-v1",
        status: "teaching-preview",
        access: "profile",
        delivery: "native-page-and-pdf",
        download: "/notes/esat/esat-mathematics-foundations-v1.pdf",
        route: "/exams/esat/notes/mathematics",
      }),
      expect.objectContaining({
        id: "esat-science-review-notes-v1",
        status: "teaching-preview",
        access: "profile",
        delivery: "native-page-and-pdf",
        download: "/notes/esat/esat-sciences-foundations-v1.pdf",
        route: "/exams/esat/notes/sciences",
      }),
    ]));
    expect(publicContentProducts("tara")).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "tara-review-notes-v1",
        status: "teaching-preview",
        access: "profile",
        delivery: "native-page-and-pdf",
        download: "/notes/tara/tara-reasoning-writing-foundations-v1.pdf",
        route: "/exams/tara/notes/foundations",
      }),
    ]));
    expect(publicContentProducts("lnat")).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "lnat-review-notes-v1",
        status: "teaching-preview",
        access: "profile",
        delivery: "native-page-and-pdf",
        download: "/notes/lnat/lnat-reading-writing-foundations-v1.pdf",
        route: "/exams/lnat/notes/foundations",
      }),
    ]));
    expect(publicContentProducts("ucat")).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "ucat-review-notes-v1",
        status: "teaching-preview",
        access: "profile",
        delivery: "native-page-and-pdf",
        download: "/notes/ucat/ucat-four-subtest-foundations-v1.pdf",
        route: "/exams/ucat/notes/foundations",
      }),
    ]));
  });

  it("resolves a practice's deep review through the product catalog instead of page copy", () => {
    expect(reviewContentProductsForPractice("tmua-specimen-p1")).toEqual([
      expect.objectContaining({
        id: "tmua-specimen-p1-worked-explanations-v1",
        access: "invite",
        packageIds: ["tmua-deep-review", "tmua-full-access"],
        relatedPracticeIds: ["tmua-specimen-p1"],
      }),
    ]);
    expect(reviewContentProductsForPractice("tmua-2023-p1")).toEqual([]);
  });

  it("resolves every granted package to the published products the student can actually open", () => {
    expect(inviteContentProductsForPackages(["tmua-deep-review"]).map((product) => product.id)).toEqual([
      "tmua-specimen-p1-worked-explanations-v1",
    ]);
    expect(inviteContentProductsForPackages(["tmua-full-access"]).map((product) => product.id)).toEqual([
      "tmua-specimen-p1-worked-explanations-v1",
      "tmua-six-week-review-plan-v1",
    ]);
    expect(inviteContentProductsForPackages(["draft-or-unknown-package"])).toEqual([]);
  });

  it("requires every published invite product and package mapping to exist in its release SQL", async () => {
    for (const product of publicContentProducts().filter((candidate) => candidate.access === "invite")) {
      const migrationEvidence = product.evidence.filter((evidence) => evidence.endsWith(".sql"));
      expect(migrationEvidence, `${product.id} needs release SQL evidence`).not.toHaveLength(0);
      const releaseSql = (await Promise.all(migrationEvidence.map((evidence) => readFile(evidence, "utf8")))).join("\n");

      expect(releaseSql, `${product.id} must exist as a published database resource`).toContain(`'${product.id}'`);
      expect(releaseSql).toContain("'published'");
      for (const packageId of product.packageIds ?? []) {
        expect(
          releaseSql,
          `${product.id} must be attached to ${packageId}`,
        ).toContain(`'${packageId}', '${product.id}'`);
      }
    }
  });

  it("keeps every public product route inside the application route set", async () => {
    const routeSource = await readFile("src/app/routes.tsx", "utf8");
    const guideRoutes = new Set(EXAM_CATALOG.map((exam) => exam.href));
    for (const product of publicContentProducts()) {
      const route = product.route!;
      const matchesPracticeRoute = route.startsWith("/practice/")
        && routeSource.includes('path: "/practice/:paperId"');
      expect(
        routeSource.includes(`path: \"${route}\"`) || guideRoutes.has(route) || matchesPracticeRoute,
        `${product.id} points to an unregistered route ${route}`,
      ).toBe(true);
    }
  });
});
