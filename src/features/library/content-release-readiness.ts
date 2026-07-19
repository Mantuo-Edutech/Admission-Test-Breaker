export type CatalogPublicationStatus = "published" | "teaching-preview" | "internal-review";
export type CatalogVisibility = "public" | "internal";
export type FeatureStatus = "verified" | "partial" | "planned";
export type ClaimStatus = "verified" | "partial" | "planned";
export type ManualCheckStatus = "passed" | "pending";

export interface ReleaseCatalogProduct {
  readonly id: string;
  readonly examId: string;
  readonly kind: string;
  readonly status: CatalogPublicationStatus;
  readonly visibility: CatalogVisibility;
  readonly route?: string;
  readonly evidence: readonly string[];
}

export interface ReleaseFeatureClaim {
  readonly id: string;
  readonly status: ClaimStatus;
}

export interface ReleaseManualCheck {
  readonly id: string;
  readonly status: ManualCheckStatus;
  readonly reviewer?: string;
  readonly reviewerRole?: string;
  readonly checkedAt?: string;
  readonly evidence?: string;
  readonly viewports?: readonly string[];
}

export interface ReleaseDecisionApproval {
  readonly decisionId: string;
  readonly decisionFile: string;
  readonly reviewedAt: string;
  readonly reviewerRole: string;
  readonly evidenceSummary: string;
}

export interface ReleaseManualApproval {
  readonly id: string;
  readonly source: "feature-manifest" | "review-decision";
  readonly reviewerRole: string;
  readonly reviewedAt: string;
  readonly evidence: string;
  readonly decisionId?: string;
  readonly decisionFile?: string;
}

export interface ReleaseFeatureManifest {
  readonly path: string;
  readonly featureId: string;
  readonly featureStatus: FeatureStatus;
  readonly claims: readonly ReleaseFeatureClaim[];
  readonly manualChecks: readonly ReleaseManualCheck[];
}

export interface ProductReleaseReadiness {
  readonly productId: string;
  readonly examId: string;
  readonly kind: string;
  readonly catalogStatus: CatalogPublicationStatus;
  readonly visibility: CatalogVisibility;
  readonly featureManifest: string | null;
  readonly featureId: string | null;
  readonly featureStatus: FeatureStatus | null;
  readonly automatedReady: boolean;
  readonly manualReady: boolean;
  readonly closedBetaReady: boolean;
  readonly finalPublicationReady: boolean;
  readonly manualApprovals: readonly ReleaseManualApproval[];
  readonly pendingManualChecks: readonly ReleaseManualCheck[];
  readonly closedBetaBlockers: readonly string[];
  readonly finalPublicationBlockers: readonly string[];
}

export interface ContentReleaseReadinessReport {
  readonly schemaVersion: 1;
  readonly policyVersion: "1.0.0";
  readonly catalogRevision: string;
  readonly assessedAt: string;
  readonly policy: {
    readonly closedBeta: readonly string[];
    readonly finalPublication: readonly string[];
  };
  readonly summary: {
    readonly totalProducts: number;
    readonly publicProducts: number;
    readonly internalProducts: number;
    readonly automatedReadyProducts: number;
    readonly manualReadyProducts: number;
    readonly closedBetaReadyProducts: number;
    readonly finalPublicationReadyProducts: number;
    readonly closedBetaCoveragePercent: number;
  };
  readonly products: readonly ProductReleaseReadiness[];
}

const FEATURE_EVIDENCE_PREFIX = "verification/features/";

function featureEvidencePaths(product: ReleaseCatalogProduct): string[] {
  return product.evidence.filter((item) => item.startsWith(FEATURE_EVIDENCE_PREFIX));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function assessProductReleaseReadiness(
  product: ReleaseCatalogProduct,
  manifests: ReadonlyMap<string, ReleaseFeatureManifest>,
  decisionApprovals: ReadonlyMap<string, ReleaseDecisionApproval> = new Map(),
): ProductReleaseReadiness {
  const manifestPaths = featureEvidencePaths(product);
  if (manifestPaths.length > 1) {
    throw new Error(`${product.id} has more than one primary feature manifest`);
  }
  const manifestPath = manifestPaths[0] ?? null;
  const manifest = manifestPath === null ? null : manifests.get(manifestPath) ?? null;
  const pendingClaims = manifest?.claims.filter((claim) => claim.status !== "verified") ?? [];
  const manualApprovals = manifest?.manualChecks.flatMap((check): readonly ReleaseManualApproval[] => {
    if (check.status === "passed") {
      return [{
        id: check.id,
        source: "feature-manifest",
        reviewerRole: check.reviewerRole ?? "unrecorded",
        reviewedAt: check.checkedAt ?? "unrecorded",
        evidence: check.evidence ?? "unrecorded",
      }];
    }
    const decision = decisionApprovals.get(`${manifest.featureId}/${check.id}`);
    return decision === undefined
      ? []
      : [{
          id: check.id,
          source: "review-decision",
          reviewerRole: decision.reviewerRole,
          reviewedAt: decision.reviewedAt,
          evidence: decision.evidenceSummary,
          decisionId: decision.decisionId,
          decisionFile: decision.decisionFile,
        }];
  }) ?? [];
  const approvedManualCheckIds = new Set(manualApprovals.map((approval) => approval.id));
  const pendingManualChecks = manifest?.manualChecks.filter((check) =>
    !approvedManualCheckIds.has(check.id)) ?? [];
  const automatedReady = manifest !== null && pendingClaims.length === 0;
  const manualReady = manifest !== null && pendingManualChecks.length === 0;

  const closedBetaBlockers: string[] = [];
  if (product.visibility === "internal") closedBetaBlockers.push("internal-product");
  if (product.visibility === "public" && !product.route?.startsWith("/")) {
    closedBetaBlockers.push("missing-internal-route");
  }
  if (manifestPath === null) closedBetaBlockers.push("missing-feature-manifest");
  else if (manifest === null) closedBetaBlockers.push("unreadable-feature-manifest");
  closedBetaBlockers.push(
    ...pendingClaims.map((claim) => `unverified-claim:${claim.id}`),
    ...pendingManualChecks.map((check) => `pending-manual-check:${check.id}`),
  );

  const closedBetaReady = closedBetaBlockers.length === 0;
  const finalPublicationBlockers = [...closedBetaBlockers];
  if (product.status !== "published") {
    finalPublicationBlockers.push(`catalog-status:${product.status}`);
  }
  if (manifest !== null && manifest.featureStatus !== "verified") {
    finalPublicationBlockers.push(`feature-status:${manifest.featureStatus}`);
  }

  return {
    productId: product.id,
    examId: product.examId,
    kind: product.kind,
    catalogStatus: product.status,
    visibility: product.visibility,
    featureManifest: manifestPath,
    featureId: manifest?.featureId ?? null,
    featureStatus: manifest?.featureStatus ?? null,
    automatedReady,
    manualReady,
    closedBetaReady,
    finalPublicationReady: finalPublicationBlockers.length === 0,
    manualApprovals,
    pendingManualChecks,
    closedBetaBlockers: unique(closedBetaBlockers),
    finalPublicationBlockers: unique(finalPublicationBlockers),
  };
}

export function buildContentReleaseReadinessReport(input: {
  readonly catalogRevision: string;
  readonly assessedAt: string;
  readonly products: readonly ReleaseCatalogProduct[];
  readonly manifests: ReadonlyMap<string, ReleaseFeatureManifest>;
  readonly decisionApprovals?: ReadonlyMap<string, ReleaseDecisionApproval>;
}): ContentReleaseReadinessReport {
  const products = input.products.map((product) =>
    assessProductReleaseReadiness(product, input.manifests, input.decisionApprovals));
  const publicProducts = products.filter((product) => product.visibility === "public");
  const count = (predicate: (product: ProductReleaseReadiness) => boolean): number =>
    products.filter(predicate).length;
  const closedBetaReadyProducts = publicProducts.filter((product) => product.closedBetaReady).length;

  return {
    schemaVersion: 1,
    policyVersion: "1.0.0",
    catalogRevision: input.catalogRevision,
    assessedAt: input.assessedAt,
    policy: {
      closedBeta: [
        "Product is public and has an internal route.",
        "Exactly one readable feature manifest is linked from catalog evidence.",
        "Every automated claim is verified.",
        "Every manual check is passed with dated evidence.",
      ],
      finalPublication: [
        "Every closed-Beta requirement passes.",
        "Catalog status is published.",
        "Feature manifest status is verified.",
      ],
    },
    summary: {
      totalProducts: products.length,
      publicProducts: publicProducts.length,
      internalProducts: products.length - publicProducts.length,
      automatedReadyProducts: count((product) => product.automatedReady),
      manualReadyProducts: count((product) => product.manualReady),
      closedBetaReadyProducts,
      finalPublicationReadyProducts: count((product) => product.finalPublicationReady),
      closedBetaCoveragePercent: publicProducts.length === 0
        ? 0
        : Math.round((closedBetaReadyProducts / publicProducts.length) * 100),
    },
    products,
  };
}
