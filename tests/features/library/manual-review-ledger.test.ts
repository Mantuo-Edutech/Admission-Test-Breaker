import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildContentReleaseReadinessReport } from "../../../src/features/library/content-release-readiness.js";
import { buildManualReviewWorklist } from "../../../src/features/library/manual-review-worklist.js";
import { loadContentReleaseInputs } from "../../../scripts/lib/content-release-inputs.js";
import {
  enrichManualReviewWorklist,
  loadManualReviewLedger,
} from "../../../scripts/lib/manual-review-ledger.js";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((target) => rm(target, { recursive: true, force: true })));
});

async function currentWorklist() {
  const inputs = await loadContentReleaseInputs();
  const report = buildContentReleaseReadinessReport({
    catalogRevision: inputs.catalog.revision,
    assessedAt: inputs.assessedAt,
    products: inputs.catalog.products,
    manifests: inputs.manifests,
  });
  return enrichManualReviewWorklist(
    buildManualReviewWorklist({ report, catalogProducts: inputs.catalog.products }),
    inputs.catalog,
    inputs.claimArtifactsByManifest,
  );
}

describe("manual review source and decision ledger", () => {
  it("pins every pending review to current product and claim artifacts", async () => {
    const worklist = await currentWorklist();
    const items = worklist.campaigns.flatMap((campaign) => campaign.items);

    expect(items).toHaveLength(68);
    for (const item of items) {
      expect(item.sourceFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(item.sourceArtifactCount).toBeGreaterThan(0);
    }
  });

  it("releases only a current approval and fails when its evidence is edited", async () => {
    const worklist = await currentWorklist();
    const item = worklist.campaigns[0]!.items[0]!;
    const decisionDirectory = await mkdtemp(path.join(os.tmpdir(), "manual-review-decisions-"));
    cleanup.push(decisionDirectory);
    const evidenceDirectory = await mkdtemp(
      path.resolve("verification/reviews/evidence/.ledger-test-"),
    );
    cleanup.push(evidenceDirectory);
    const evidencePath = path.join(evidenceDirectory, "review.md");
    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(evidencePath, "Independent review evidence for the current source.\n", "utf8");
    const relativeEvidence = path.relative(process.cwd(), evidencePath).split(path.sep).join("/");
    const evidenceHash = `sha256:${createHash("sha256")
      .update(await readFile(evidencePath))
      .digest("hex")}`;
    const decisionId = "current-source-review-2026-07-19-01";
    const decision = {
      schemaVersion: 1,
      decisionId,
      reviewKey: item.reviewKey,
      sourceFingerprint: item.sourceFingerprint,
      outcome: "approved",
      reviewedAt: "2026-07-19",
      recordedAt: "2026-07-19T09:00:00.000Z",
      reviewLead: { reference: "staff:content-lead-01", role: item.ownerRole },
      reviewers: [{ reference: "reviewer:subject-01", role: "qualified-subject-reviewer", independent: true }],
      evidence: {
        summary: "The complete current source was checked and all findings were resolved.",
        artifacts: [{ path: relativeEvidence, sha256: evidenceHash }],
      },
      attested: true,
    };
    await writeFile(
      path.join(decisionDirectory, `${decisionId}.json`),
      `${JSON.stringify(decision, null, 2)}\n`,
      "utf8",
    );

    const ledger = await loadManualReviewLedger(worklist, decisionDirectory, "2026-07-19");
    expect(ledger.approvals.has(item.reviewKey)).toBe(true);
    expect(ledger.summary).toMatchObject({ approvedCurrentReviews: 1, staleReviews: 0 });

    await writeFile(evidencePath, "Evidence was edited after approval.\n", "utf8");
    await expect(loadManualReviewLedger(worklist, decisionDirectory, "2026-07-19"))
      .rejects.toThrow("evidence hash no longer matches");
  });

  it("retains a stale decision as history but never treats it as approval", async () => {
    const worklist = await currentWorklist();
    const item = worklist.campaigns[0]!.items[0]!;
    const decisionDirectory = await mkdtemp(path.join(os.tmpdir(), "manual-review-stale-"));
    cleanup.push(decisionDirectory);
    const evidenceDirectory = await mkdtemp(
      path.resolve("verification/reviews/evidence/.ledger-test-"),
    );
    cleanup.push(evidenceDirectory);
    const evidencePath = path.join(evidenceDirectory, "review.md");
    await writeFile(evidencePath, "Historical evidence for an earlier source revision.\n", "utf8");
    const relativeEvidence = path.relative(process.cwd(), evidencePath).split(path.sep).join("/");
    const evidenceHash = `sha256:${createHash("sha256")
      .update(await readFile(evidencePath))
      .digest("hex")}`;
    const decisionId = "stale-source-review-2026-07-19-01";
    await writeFile(path.join(decisionDirectory, `${decisionId}.json`), `${JSON.stringify({
      schemaVersion: 1,
      decisionId,
      reviewKey: item.reviewKey,
      sourceFingerprint: `sha256:${"0".repeat(64)}`,
      outcome: "approved",
      reviewedAt: "2026-07-19",
      recordedAt: "2026-07-19T09:00:00.000Z",
      reviewLead: { reference: "staff:content-lead-01", role: item.ownerRole },
      reviewers: [{ reference: "reviewer:subject-01", role: "qualified-subject-reviewer", independent: true }],
      evidence: {
        summary: "The earlier source was fully checked, but it is no longer the current source.",
        artifacts: [{ path: relativeEvidence, sha256: evidenceHash }],
      },
      attested: true,
    }, null, 2)}\n`, "utf8");

    const ledger = await loadManualReviewLedger(worklist, decisionDirectory, "2026-07-19");
    expect(ledger.approvals.has(item.reviewKey)).toBe(false);
    expect(ledger.summary.staleReviews).toBe(1);
  });
});
