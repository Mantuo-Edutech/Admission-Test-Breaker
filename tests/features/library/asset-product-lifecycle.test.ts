import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTENT_PRODUCT_CATALOG,
  internalContentProducts,
  publicContentProducts,
} from "../../../src/features/library/content-product-registry.js";

type Classification =
  | "published-product-source"
  | "internal-product-source"
  | "normalized-staging"
  | "research-source"
  | "platform-model"
  | "release-control"
  | "documentation"
  | "schema";

interface AssetGroup {
  id: string;
  classification: Classification;
  paths: string[];
  pathPrefixes: string[];
  productIds: string[];
  publicDelivery: boolean;
}

interface AssetLifecycle {
  schemaVersion: number;
  revision: string;
  policy: Record<string, boolean>;
  groups: AssetGroup[];
}

async function filesBelow(directory: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(current: string) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      if (entry.isFile()) files.push(absolute.split(path.sep).join("/"));
    }
  }
  await visit(directory);
  return files.sort();
}

function matches(group: AssetGroup, file: string): boolean {
  return group.paths.includes(file) || group.pathPrefixes.some((prefix) => file.startsWith(prefix));
}

describe("content asset to web product lifecycle", () => {
  it("classifies every local content file exactly once", async () => {
    const lifecycle = JSON.parse(
      await readFile("content/products/asset-lifecycle.json", "utf8"),
    ) as AssetLifecycle;
    const productIds = new Set(CONTENT_PRODUCT_CATALOG.products.map((product) => product.id));
    const files = await filesBelow("content");

    expect(lifecycle).toMatchObject({
      schemaVersion: 1,
      revision: "2026-07-23.1",
      policy: {
        everyContentFileMustHaveLifecycle: true,
        sourceAssetIsNotAutomaticallyAProduct: true,
        internalReviewIsNeverPublic: true,
        publishedProductRequiresInternalWebRoute: true,
      },
    });
    expect(new Set(lifecycle.groups.map((group) => group.id)).size).toBe(lifecycle.groups.length);

    for (const group of lifecycle.groups) {
      expect(group.paths.length + group.pathPrefixes.length).toBeGreaterThan(0);
      expect(new Set(group.productIds).size).toBe(group.productIds.length);
      for (const productId of group.productIds) expect(productIds.has(productId)).toBe(true);
    }

    for (const file of files) {
      const matchingGroups = lifecycle.groups.filter((group) => matches(group, file));
      expect(
        matchingGroups.map((group) => group.id),
        `${file} must have exactly one lifecycle classification`,
      ).toHaveLength(1);
    }
  });

  it("connects every product to a classified asset group without exposing internal research", async () => {
    const lifecycle = JSON.parse(
      await readFile("content/products/asset-lifecycle.json", "utf8"),
    ) as AssetLifecycle;
    const publicIds = new Set(publicContentProducts().map((product) => product.id));
    const internalIds = new Set(internalContentProducts().map((product) => product.id));
    const linkedProductIds = new Set(lifecycle.groups.flatMap((group) => group.productIds));

    for (const product of CONTENT_PRODUCT_CATALOG.products) {
      expect(linkedProductIds.has(product.id), `${product.id} needs an asset lineage`).toBe(true);
    }
    for (const group of lifecycle.groups) {
      if (group.classification === "internal-product-source") {
        expect(group.publicDelivery).toBe(false);
        expect(group.productIds.every((id) => internalIds.has(id))).toBe(true);
      }
      if (group.classification === "research-source") {
        expect(group.publicDelivery).toBe(false);
      }
      if (group.publicDelivery) {
        expect(group.classification).toBe("published-product-source");
        expect(group.productIds.every((id) => publicIds.has(id))).toBe(true);
      }
    }
  });

  it("requires every authored practice or published notes file to be direct product evidence", async () => {
    const files = (await filesBelow("content")).filter(
      (file) =>
        /^content\/(?:tmua|esat|tara|lnat|ucat)\/original-practice\/.+\.json$/u.test(file) ||
        /^content\/notes\/(?:tmua|esat|tara|lnat|ucat)\/.+\.json$/u.test(file),
    );
    const evidence = new Set(CONTENT_PRODUCT_CATALOG.products.flatMap((product) => product.evidence));

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(evidence.has(file), `${file} must be direct evidence of a product`).toBe(true);
    }
  });
});
