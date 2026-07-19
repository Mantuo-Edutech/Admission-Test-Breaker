import { describe, expect, it } from "vitest";
import {
  latestDecision,
  parseManualReviewDecision,
  type ManualReviewDecisionAssessment,
} from "../../../src/features/library/manual-review-decisions.js";
import type { ManualReviewWorkItem } from "../../../src/features/library/manual-review-worklist.js";

const item: ManualReviewWorkItem = {
  reviewKey: "feature/check",
  campaignId: "academic-content",
  featureId: "feature",
  featureManifest: "verification/features/feature.yaml",
  manualCheckId: "check",
  status: "pending",
  ownerRole: "content-review-lead",
  independenceRequired: true,
  evidenceRequirement: "Independent review is required.",
  viewports: ["content"],
  products: [{ productId: "product", examId: "tmua", version: "1.0.0", route: "/route" }],
  sourceFingerprint: `sha256:${"a".repeat(64)}`,
  sourceArtifactCount: 2,
};

function validDecision() {
  return {
    schemaVersion: 1,
    decisionId: "feature-check-2026-07-19-01",
    reviewKey: "feature/check",
    sourceFingerprint: `sha256:${"a".repeat(64)}`,
    outcome: "approved",
    reviewedAt: "2026-07-19",
    recordedAt: "2026-07-19T09:00:00.000Z",
    reviewLead: { reference: "staff:content-lead-01", role: "content-review-lead" },
    reviewers: [{ reference: "reviewer:math-01", role: "tmua-mathematics-teacher", independent: true }],
    evidence: {
      summary: "Every item and answer was independently checked against the stated scope.",
      artifacts: [{
        path: "verification/reviews/evidence/feature-check.md",
        sha256: `sha256:${"b".repeat(64)}`,
      }],
    },
    attested: true,
  };
}

describe("manual review decisions", () => {
  it("accepts a privacy-safe, role-bound, source-bound and attested decision", () => {
    expect(parseManualReviewDecision(
      validDecision(),
      item,
      "verification/reviews/decisions/example.json",
      "2026-07-19",
    )).toMatchObject({
      reviewKey: item.reviewKey,
      outcome: "approved",
      reviewLead: { role: item.ownerRole },
    });
  });

  it("rejects missing independence, wrong owner roles and mutable evidence references", () => {
    const noIndependence = validDecision();
    noIndependence.reviewers[0]!.independent = false;
    expect(() => parseManualReviewDecision(noIndependence, item, "decision.json", "2026-07-19"))
      .toThrow("requires an independent reviewer");

    const wrongOwner = validDecision();
    wrongOwner.reviewLead.role = "general-admin";
    expect(() => parseManualReviewDecision(wrongOwner, item, "decision.json", "2026-07-19"))
      .toThrow("content-review-lead");

    const externalEvidence = validDecision();
    externalEvidence.evidence.artifacts[0]!.path = "output/untracked-review.md";
    expect(() => parseManualReviewDecision(externalEvidence, item, "decision.json", "2026-07-19"))
      .toThrow("verification/reviews/evidence");
  });

  it("selects the latest recorded decision while retaining earlier history", () => {
    const first = parseManualReviewDecision(
      validDecision(), item, "first.json", "2026-07-20",
    );
    const secondValue = validDecision();
    secondValue.decisionId = "feature-check-2026-07-20-02";
    secondValue.outcome = "changes-requested";
    secondValue.reviewedAt = "2026-07-20";
    secondValue.recordedAt = "2026-07-20T10:00:00.000Z";
    const second = parseManualReviewDecision(secondValue, item, "second.json", "2026-07-20");
    const assessments: ManualReviewDecisionAssessment[] = [
      { decision: first, currentSource: true },
      { decision: second, currentSource: true },
    ];

    expect(latestDecision(assessments)?.decision.decisionId).toBe(second.decisionId);
    expect(latestDecision(assessments)?.decision.outcome).toBe("changes-requested");
  });

  it("rejects a future timestamp that could otherwise dominate the decision history", () => {
    const future = validDecision();
    future.recordedAt = "2099-01-01T00:00:00.000Z";
    expect(() => parseManualReviewDecision(future, item, "decision.json", "2026-07-19"))
      .toThrow("future recordedAt");
  });
});
