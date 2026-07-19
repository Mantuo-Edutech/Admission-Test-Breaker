import type { ManualReviewWorkItem } from "./manual-review-worklist.js";

export type ManualReviewOutcome = "approved" | "changes-requested";

export interface ManualReviewEvidenceArtifact {
  readonly path: string;
  readonly sha256: string;
}

export interface ManualReviewer {
  readonly reference: string;
  readonly role: string;
  readonly independent: boolean;
}

export interface ManualReviewDecision {
  readonly schemaVersion: 1;
  readonly decisionId: string;
  readonly reviewKey: string;
  readonly sourceFingerprint: string;
  readonly outcome: ManualReviewOutcome;
  readonly reviewedAt: string;
  readonly recordedAt: string;
  readonly reviewLead: {
    readonly reference: string;
    readonly role: string;
  };
  readonly reviewers: readonly ManualReviewer[];
  readonly evidence: {
    readonly summary: string;
    readonly artifacts: readonly ManualReviewEvidenceArtifact[];
  };
  readonly attested: true;
}

export interface CurrentManualReviewDecision extends ManualReviewDecision {
  readonly decisionFile: string;
}

export interface ManualReviewDecisionAssessment {
  readonly decision: CurrentManualReviewDecision;
  readonly currentSource: boolean;
}

const decisionIdPattern = /^[a-z0-9][a-z0-9._-]{7,95}$/u;
const referencePattern = /^[a-z0-9][a-z0-9:._-]{2,79}$/u;
const sha256Pattern = /^sha256:[0-9a-f]{64}$/u;
const reviewDatePattern = /^\d{4}-\d{2}-\d{2}$/u;
const recordedAtPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function safeEvidencePath(value: string): boolean {
  return value.startsWith("verification/reviews/evidence/")
    && !value.startsWith("/")
    && !value.split(/[\\/]/u).includes("..");
}

export function requireAuditableReviewItem(item: ManualReviewWorkItem): asserts item is ManualReviewWorkItem & {
  readonly sourceFingerprint: string;
  readonly sourceArtifactCount: number;
} {
  if (!sha256Pattern.test(item.sourceFingerprint ?? "")) {
    throw new Error(`${item.reviewKey} has no current source fingerprint`);
  }
  if (!Number.isInteger(item.sourceArtifactCount) || (item.sourceArtifactCount ?? 0) < 1) {
    throw new Error(`${item.reviewKey} has no reviewable source artifacts`);
  }
}

export function parseManualReviewDecision(
  value: unknown,
  item: ManualReviewWorkItem,
  decisionFile: string,
  today: string,
): CurrentManualReviewDecision {
  requireAuditableReviewItem(item);
  if (!isRecord(value)) throw new Error(`${decisionFile} must contain an object`);
  if (value.schemaVersion !== 1) throw new Error(`${decisionFile} has an unsupported schema version`);

  const decisionId = requiredString(value.decisionId, `${decisionFile} decisionId`);
  if (!decisionIdPattern.test(decisionId)) throw new Error(`${decisionFile} has an invalid decisionId`);
  const reviewKey = requiredString(value.reviewKey, `${decisionFile} reviewKey`);
  if (reviewKey !== item.reviewKey) throw new Error(`${decisionFile} targets the wrong review item`);
  const sourceFingerprint = requiredString(
    value.sourceFingerprint,
    `${decisionFile} sourceFingerprint`,
  );
  if (!sha256Pattern.test(sourceFingerprint)) {
    throw new Error(`${decisionFile} has an invalid source fingerprint`);
  }
  if (value.outcome !== "approved" && value.outcome !== "changes-requested") {
    throw new Error(`${decisionFile} has an unsupported outcome`);
  }
  const reviewedAt = requiredString(value.reviewedAt, `${decisionFile} reviewedAt`);
  if (!reviewDatePattern.test(reviewedAt) || Number.isNaN(Date.parse(`${reviewedAt}T00:00:00Z`))) {
    throw new Error(`${decisionFile} has an invalid review date`);
  }
  if (reviewedAt > today) throw new Error(`${decisionFile} cannot be dated in the future`);
  const recordedAt = requiredString(value.recordedAt, `${decisionFile} recordedAt`);
  if (!recordedAtPattern.test(recordedAt) || Number.isNaN(Date.parse(recordedAt))) {
    throw new Error(`${decisionFile} has an invalid recordedAt timestamp`);
  }
  const latestPossibleCurrentInstant = Date.parse(`${today}T23:59:59-12:00`);
  if (Date.parse(recordedAt) > latestPossibleCurrentInstant) {
    throw new Error(`${decisionFile} cannot use a future recordedAt timestamp`);
  }
  const earliestPossibleReviewInstant = Date.parse(`${reviewedAt}T00:00:00+14:00`);
  if (Date.parse(recordedAt) < earliestPossibleReviewInstant) {
    throw new Error(`${decisionFile} was recorded before the stated review date`);
  }

  if (!isRecord(value.reviewLead)) throw new Error(`${decisionFile} has no review lead`);
  const leadReference = requiredString(
    value.reviewLead.reference,
    `${decisionFile} reviewLead.reference`,
  );
  if (!referencePattern.test(leadReference)) {
    throw new Error(`${decisionFile} has an invalid privacy-safe lead reference`);
  }
  const leadRole = requiredString(value.reviewLead.role, `${decisionFile} reviewLead.role`);
  if (leadRole !== item.ownerRole) {
    throw new Error(`${decisionFile} must be approved by the ${item.ownerRole} owner role`);
  }

  if (!Array.isArray(value.reviewers) || value.reviewers.length === 0) {
    throw new Error(`${decisionFile} must name at least one qualified reviewer reference`);
  }
  const reviewers = value.reviewers.map((reviewer, index): ManualReviewer => {
    if (!isRecord(reviewer)) throw new Error(`${decisionFile} reviewer ${index} must be an object`);
    const reference = requiredString(
      reviewer.reference,
      `${decisionFile} reviewers[${index}].reference`,
    );
    if (!referencePattern.test(reference)) {
      throw new Error(`${decisionFile} reviewer ${index} has an invalid privacy-safe reference`);
    }
    const role = requiredString(reviewer.role, `${decisionFile} reviewers[${index}].role`);
    if (typeof reviewer.independent !== "boolean") {
      throw new Error(`${decisionFile} reviewer ${index} must declare independence`);
    }
    return { reference, role, independent: reviewer.independent };
  });
  if (new Set(reviewers.map((reviewer) => reviewer.reference)).size !== reviewers.length) {
    throw new Error(`${decisionFile} contains duplicate reviewer references`);
  }
  if (item.independenceRequired && !reviewers.some((reviewer) => reviewer.independent)) {
    throw new Error(`${decisionFile} requires an independent reviewer`);
  }

  if (!isRecord(value.evidence)) throw new Error(`${decisionFile} has no evidence record`);
  const evidenceSummary = requiredString(value.evidence.summary, `${decisionFile} evidence.summary`);
  if (evidenceSummary.length < 20) {
    throw new Error(`${decisionFile} evidence summary is too short`);
  }
  if (!Array.isArray(value.evidence.artifacts) || value.evidence.artifacts.length === 0) {
    throw new Error(`${decisionFile} must attach at least one local evidence artifact`);
  }
  const evidenceArtifacts = value.evidence.artifacts.map((artifact, index): ManualReviewEvidenceArtifact => {
    if (!isRecord(artifact)) throw new Error(`${decisionFile} evidence artifact ${index} must be an object`);
    const artifactPath = requiredString(
      artifact.path,
      `${decisionFile} evidence.artifacts[${index}].path`,
    );
    if (!safeEvidencePath(artifactPath)) {
      throw new Error(`${decisionFile} evidence must stay under verification/reviews/evidence`);
    }
    const sha256 = requiredString(
      artifact.sha256,
      `${decisionFile} evidence.artifacts[${index}].sha256`,
    );
    if (!sha256Pattern.test(sha256)) {
      throw new Error(`${decisionFile} evidence artifact ${index} has an invalid SHA-256`);
    }
    return { path: artifactPath, sha256 };
  });
  if (new Set(evidenceArtifacts.map((artifact) => artifact.path)).size !== evidenceArtifacts.length) {
    throw new Error(`${decisionFile} contains duplicate evidence artifacts`);
  }
  if (value.attested !== true) throw new Error(`${decisionFile} has not been attested`);

  return {
    schemaVersion: 1,
    decisionId,
    reviewKey,
    sourceFingerprint,
    outcome: value.outcome,
    reviewedAt,
    recordedAt,
    reviewLead: { reference: leadReference, role: leadRole },
    reviewers,
    evidence: { summary: evidenceSummary, artifacts: evidenceArtifacts },
    attested: true,
    decisionFile,
  };
}

export function latestDecision(
  assessments: readonly ManualReviewDecisionAssessment[],
): ManualReviewDecisionAssessment | null {
  return [...assessments].sort((left, right) => {
    const recorded = right.decision.recordedAt.localeCompare(left.decision.recordedAt);
    return recorded !== 0
      ? recorded
      : right.decision.decisionId.localeCompare(left.decision.decisionId);
  })[0] ?? null;
}
