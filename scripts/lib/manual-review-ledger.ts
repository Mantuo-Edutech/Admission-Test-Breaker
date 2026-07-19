import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { ReleaseDecisionApproval } from "../../src/features/library/content-release-readiness.js";
import {
  latestDecision,
  parseManualReviewDecision,
  requireAuditableReviewItem,
  type ManualReviewDecisionAssessment,
} from "../../src/features/library/manual-review-decisions.js";
import type {
  ManualReviewWorkItem,
  ManualReviewWorklist,
} from "../../src/features/library/manual-review-worklist.js";
import type { ReleaseCatalogFile } from "./content-release-inputs.js";

interface ArtifactDigest {
  readonly path: string;
  readonly sha256: string;
}

export interface ManualReviewLedger {
  readonly assessmentsByReviewKey: ReadonlyMap<string, readonly ManualReviewDecisionAssessment[]>;
  readonly approvals: ReadonlyMap<string, ReleaseDecisionApproval>;
  readonly summary: {
    readonly decisionFiles: number;
    readonly approvedCurrentReviews: number;
    readonly changesRequestedReviews: number;
    readonly staleReviews: number;
  };
}

function safeRelativePath(filePath: string): boolean {
  return !path.isAbsolute(filePath) && !filePath.split(/[\\/]/u).includes("..");
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function sha256(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function artifactDigests(paths: readonly string[]): Promise<readonly ArtifactDigest[]> {
  const unique = [...new Set(paths)].sort();
  return Promise.all(unique.map(async (filePath) => {
    if (!safeRelativePath(filePath)) throw new Error(`Unsafe manual-review source path ${filePath}`);
    await access(path.resolve(filePath));
    return { path: filePath, sha256: await sha256(path.resolve(filePath)) };
  }));
}

function items(worklist: ManualReviewWorklist): readonly ManualReviewWorkItem[] {
  return worklist.campaigns.flatMap((campaign) => campaign.items);
}

export async function enrichManualReviewWorklist(
  worklist: ManualReviewWorklist,
  catalog: ReleaseCatalogFile,
  claimArtifactsByManifest: ReadonlyMap<string, readonly string[]>,
): Promise<ManualReviewWorklist> {
  const productById = new Map(catalog.products.map((product) => [product.id, product]));
  const campaigns = await Promise.all(worklist.campaigns.map(async (campaign) => ({
    ...campaign,
    items: await Promise.all(campaign.items.map(async (item) => {
      const productArtifacts = item.products.flatMap((scope) => {
        const product = productById.get(scope.productId);
        if (product === undefined) throw new Error(`${scope.productId} is missing from the product catalog`);
        return product.evidence.filter((artifact) => artifact !== item.featureManifest);
      });
      const claimArtifacts = claimArtifactsByManifest.get(item.featureManifest);
      if (claimArtifacts === undefined) {
        throw new Error(`${item.featureManifest} has no claim-artifact source set`);
      }
      const artifacts = await artifactDigests([...productArtifacts, ...claimArtifacts]);
      if (artifacts.length === 0) throw new Error(`${item.reviewKey} has no reviewable source artifacts`);
      const fingerprintInput = {
        policyVersion: worklist.policyVersion,
        sourceReleasePolicyVersion: worklist.sourceReleasePolicyVersion,
        reviewKey: item.reviewKey,
        campaignId: item.campaignId,
        ownerRole: item.ownerRole,
        independenceRequired: item.independenceRequired,
        evidenceRequirement: item.evidenceRequirement,
        viewports: item.viewports,
        products: item.products,
        artifacts,
      };
      const sourceFingerprint = `sha256:${createHash("sha256")
        .update(canonicalJson(fingerprintInput))
        .digest("hex")}`;
      return { ...item, sourceFingerprint, sourceArtifactCount: artifacts.length };
    })),
  })));
  return { ...worklist, campaigns };
}

export async function loadManualReviewLedger(
  worklist: ManualReviewWorklist,
  decisionDirectory = path.resolve("verification/reviews/decisions"),
  today = localDate(new Date()),
): Promise<ManualReviewLedger> {
  const reviewItems = new Map(items(worklist).map((item) => [item.reviewKey, item]));
  for (const item of reviewItems.values()) requireAuditableReviewItem(item);
  const decisionFiles = (await readdir(decisionDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(decisionDirectory, entry.name))
    .sort();
  const assessments = new Map<string, ManualReviewDecisionAssessment[]>();

  for (const absoluteFile of decisionFiles) {
    const relativeFile = path.relative(process.cwd(), absoluteFile).split(path.sep).join("/");
    const raw = JSON.parse(await readFile(absoluteFile, "utf8")) as unknown;
    const rawReviewKey = raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>).reviewKey
      : undefined;
    if (typeof rawReviewKey !== "string" || !reviewItems.has(rawReviewKey)) {
      throw new Error(`${relativeFile} targets an unknown or retired review item`);
    }
    const item = reviewItems.get(rawReviewKey)!;
    const decision = parseManualReviewDecision(raw, item, relativeFile, today);
    if (path.basename(absoluteFile, ".json") !== decision.decisionId) {
      throw new Error(`${relativeFile} filename must match decisionId`);
    }
    for (const artifact of decision.evidence.artifacts) {
      const currentHash = await sha256(path.resolve(artifact.path));
      if (currentHash !== artifact.sha256) {
        throw new Error(`${relativeFile} evidence hash no longer matches ${artifact.path}`);
      }
    }
    const currentSource = decision.sourceFingerprint === item.sourceFingerprint;
    const existing = assessments.get(decision.reviewKey) ?? [];
    existing.push({ decision, currentSource });
    assessments.set(decision.reviewKey, existing);
  }

  const approvals = new Map<string, ReleaseDecisionApproval>();
  let changesRequestedReviews = 0;
  let staleReviews = 0;
  for (const [reviewKey, values] of assessments) {
    const latest = latestDecision(values);
    if (latest === null) continue;
    if (!latest.currentSource) {
      staleReviews += 1;
      continue;
    }
    if (latest.decision.outcome === "changes-requested") {
      changesRequestedReviews += 1;
      continue;
    }
    approvals.set(reviewKey, {
      decisionId: latest.decision.decisionId,
      decisionFile: latest.decision.decisionFile,
      reviewedAt: latest.decision.reviewedAt,
      reviewerRole: latest.decision.reviewLead.role,
      evidenceSummary: latest.decision.evidence.summary,
    });
  }

  return {
    assessmentsByReviewKey: assessments,
    approvals,
    summary: {
      decisionFiles: decisionFiles.length,
      approvedCurrentReviews: approvals.size,
      changesRequestedReviews,
      staleReviews,
    },
  };
}
