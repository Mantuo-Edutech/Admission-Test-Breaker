import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONTENT_PRODUCT_CATALOG } from "../../../src/features/library/content-product-registry.js";

interface ReviewNotesPdfAsset {
  readonly productId: string;
  readonly examId: string;
  readonly version: string;
  readonly source: string;
  readonly sourceSha256: string;
  readonly output: string;
  readonly publicPath: string;
  readonly pageCount: number;
  readonly byteSize: number;
  readonly sha256: string;
}

interface ReviewNotesPdfManifest {
  readonly schemaVersion: 1;
  readonly generatorVersion: string;
  readonly publicationStatus: "teaching-preview";
  readonly assets: readonly ReviewNotesPdfAsset[];
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

async function loadManifest(): Promise<ReviewNotesPdfManifest> {
  return JSON.parse(
    await readFile("content/products/review-notes-pdf-assets.json", "utf8"),
  ) as ReviewNotesPdfManifest;
}

describe("generated Review Notes PDF assets", () => {
  it("tracks one deterministic A4 edition for every shared Review Notes product", async () => {
    const manifest = await loadManifest();

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      generatorVersion: "1.0.2",
      publicationStatus: "teaching-preview",
    });
    expect(manifest.assets.map((asset) => asset.productId)).toEqual([
      "esat-mathematics-review-notes-v1",
      "esat-science-review-notes-v1",
      "tara-review-notes-v1",
      "lnat-review-notes-v1",
      "ucat-review-notes-v1",
    ]);
    expect(manifest.assets.reduce((sum, asset) => sum + asset.pageCount, 0)).toBe(79);
  });

  it("matches every source, tracked public file, page count and catalog download", async () => {
    const manifest = await loadManifest();

    for (const asset of manifest.assets) {
      const sourceBytes = await readFile(path.resolve(asset.source));
      const source = JSON.parse(sourceBytes.toString("utf8")) as {
        id: string;
        version: string;
        examId: string;
        publicationStatus: string;
      };
      const publicBytes = await readFile(path.resolve("public", asset.publicPath.slice(1)));
      const pageObjects = publicBytes.toString("latin1").match(/\/Type\s*\/Page\b/gu) ?? [];
      const product = CONTENT_PRODUCT_CATALOG.products.find(
        (candidate) => candidate.id === asset.productId,
      );

      expect(source).toMatchObject({
        version: asset.version,
        examId: asset.examId,
        publicationStatus: "teaching-preview",
      });
      expect(sha256(sourceBytes)).toBe(asset.sourceSha256);
      expect(asset.output).toMatch(/^output\/pdf\/[a-z0-9-]+\.pdf$/u);
      expect(publicBytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(publicBytes.toString("latin1")).toContain("D:20000101000000+00'00'");
      expect(publicBytes.byteLength).toBe(asset.byteSize);
      expect(publicBytes.byteLength).toBeGreaterThan(100_000);
      expect(sha256(publicBytes)).toBe(asset.sha256);
      expect(pageObjects).toHaveLength(asset.pageCount);
      expect(asset.pageCount).toBeGreaterThanOrEqual(10);
      expect(product).toMatchObject({
        id: asset.productId,
        version: asset.version,
        examId: asset.examId,
        status: "teaching-preview",
        access: "profile",
        delivery: "native-page-and-pdf",
        download: asset.publicPath,
      });
      expect(product?.metrics).toContainEqual({
        label: "PDF",
        value: `${asset.pageCount} 页`,
      });
    }
  });

  it("uses the reviewed redistributable embedded CJK font asset", async () => {
    const font = await readFile("scripts/assets/fonts/NotoSansCJKsc-VF.ttf");
    const license = await readFile("scripts/assets/fonts/OFL-NOTO-CJK.txt", "utf8");

    expect(sha256(font)).toBe("990c807e79c25662a5a9ecf7f971baeb2bf2eab9a559e5ecf15cdfdb8561d21f");
    expect(license).toContain("SIL OPEN FONT LICENSE Version 1.1");
  });
});
