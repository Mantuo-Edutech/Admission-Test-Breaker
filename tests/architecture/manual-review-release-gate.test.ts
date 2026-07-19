import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("manual review release architecture", () => {
  it("keeps human decisions outside the browser bundle and in the release gate", async () => {
    const releaseScript = await readFile("scripts/check-content-release-readiness.ts", "utf8");
    const ledger = await readFile("scripts/lib/manual-review-ledger.ts", "utf8");
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(releaseScript).toContain("loadManualReviewLedger");
    expect(releaseScript).toContain("decisionApprovals: ledger.approvals");
    expect(ledger).toContain("verification/reviews/decisions");
    expect(ledger).not.toContain("public/reviews");
    expect(packageJson.scripts.verify).toContain("verify:manual-review-ledger");
    expect(packageJson.scripts["review:prepare"]).toContain("manage-manual-review.ts --prepare");
    expect(packageJson.scripts["review:record"]).toContain("manage-manual-review.ts --record");
  });
});
