import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import type {
  ClaimStatus,
  ManualCheckStatus,
  ReleaseCatalogProduct,
  ReleaseFeatureManifest,
} from "../../src/features/library/content-release-readiness.js";
import type { ManualReviewCatalogProduct } from "../../src/features/library/manual-review-worklist.js";

export interface ReleaseCatalogFile {
  readonly revision: string;
  readonly products: readonly (ReleaseCatalogProduct & ManualReviewCatalogProduct & {
    readonly lastVerifiedAt: string;
    readonly evidence: readonly string[];
  })[];
}

interface RawFeatureManifest {
  readonly feature?: { readonly id?: unknown; readonly status?: unknown };
  readonly claims?: readonly {
    readonly id?: unknown;
    readonly status?: unknown;
    readonly artifacts?: unknown;
  }[];
  readonly manualChecks?: readonly {
    readonly id?: unknown;
    readonly status?: unknown;
    readonly reviewer?: unknown;
    readonly reviewerRole?: unknown;
    readonly checkedAt?: unknown;
    readonly evidence?: unknown;
    readonly viewports?: unknown;
  }[];
}

export interface ContentReleaseInputs {
  readonly catalog: ReleaseCatalogFile;
  readonly manifests: ReadonlyMap<string, ReleaseFeatureManifest>;
  readonly claimArtifactsByManifest: ReadonlyMap<string, readonly string[]>;
  readonly assessedAt: string;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is missing`);
  return value;
}

function stringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => requiredString(item, `${label}[${index}]`));
}

function parseFeatureManifest(filePath: string, raw: string): {
  readonly manifest: ReleaseFeatureManifest;
  readonly claimArtifacts: readonly string[];
} {
  const value = parse(raw) as RawFeatureManifest;
  const featureStatus = requiredString(value.feature?.status, `${filePath} feature.status`);
  if (featureStatus !== "verified" && featureStatus !== "partial" && featureStatus !== "planned") {
    throw new Error(`${filePath} has unsupported feature status ${featureStatus}`);
  }
  const claimArtifacts: string[] = [];
  const claims = (value.claims ?? []).map((claim, index) => {
    const status = requiredString(claim.status, `${filePath} claims[${index}].status`);
    if (status !== "verified" && status !== "partial" && status !== "planned") {
      throw new Error(`${filePath} has unsupported claim status ${status}`);
    }
    claimArtifacts.push(...stringArray(
      claim.artifacts,
      `${filePath} claims[${index}].artifacts`,
    ));
    return {
      id: requiredString(claim.id, `${filePath} claims[${index}].id`),
      status: status as ClaimStatus,
    };
  });
  const manualChecks = (value.manualChecks ?? []).map((check, index) => {
    const status = requiredString(check.status, `${filePath} manualChecks[${index}].status`);
    if (status !== "passed" && status !== "pending") {
      throw new Error(`${filePath} has unsupported manual status ${status}`);
    }
    return {
      id: requiredString(check.id, `${filePath} manualChecks[${index}].id`),
      status: status as ManualCheckStatus,
      reviewer: typeof check.reviewer === "string" ? check.reviewer : undefined,
      reviewerRole: typeof check.reviewerRole === "string" ? check.reviewerRole : undefined,
      checkedAt: typeof check.checkedAt === "string" ? check.checkedAt : undefined,
      evidence: typeof check.evidence === "string" ? check.evidence : undefined,
      viewports: Array.isArray(check.viewports)
        ? check.viewports.filter((item): item is string => typeof item === "string")
        : undefined,
    };
  });

  return {
    manifest: {
      path: filePath,
      featureId: requiredString(value.feature?.id, `${filePath} feature.id`),
      featureStatus,
      claims,
      manualChecks,
    },
    claimArtifacts: [...new Set(claimArtifacts)].sort(),
  };
}

export async function loadContentReleaseInputs(): Promise<ContentReleaseInputs> {
  const catalogPath = path.resolve("content/products/catalog.json");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as ReleaseCatalogFile;
  const manifestPaths = [...new Set(catalog.products.flatMap((product) =>
    product.evidence.filter((item) => item.startsWith("verification/features/"))))].sort();
  const manifests = new Map<string, ReleaseFeatureManifest>();
  const claimArtifactsByManifest = new Map<string, readonly string[]>();
  for (const manifestPath of manifestPaths) {
    const parsed = parseFeatureManifest(
      manifestPath,
      await readFile(path.resolve(manifestPath), "utf8"),
    );
    manifests.set(manifestPath, parsed.manifest);
    claimArtifactsByManifest.set(manifestPath, parsed.claimArtifacts);
  }
  const assessedAt = catalog.products
    .map((product) => product.lastVerifiedAt)
    .sort()
    .at(-1) ?? "1970-01-01";

  return { catalog, manifests, claimArtifactsByManifest, assessedAt };
}
