import { describe, expect, it } from "vitest";
import rawPackages from "../../content/practice/server-delivery/public-paper-payloads.json" with { type: "json" };
import {
  CURRENT_PUBLISHED_PRACTICE_REVISIONS,
} from "../../src/features/practice/content/published-revisions.js";
import {
  ARCHIVED_TMUA_PAPER_IDS,
  verifyRemotePracticeCatalog,
} from "../../src/platform/remote-practice-catalog-contract.js";

const payloadByRevision = new Map(
  rawPackages.packages.map((item) => [item.paperRevisionId, item.payload] as const),
);

describe("remote published practice catalog contract", () => {
  it("covers every current paper and all 18 archived TMUA papers", async () => {
    const result = await verifyRemotePracticeCatalog(
      CURRENT_PUBLISHED_PRACTICE_REVISIONS,
      async (expected) => payloadByRevision.get(expected.paperRevisionId),
    );

    expect(result.paperCount).toBe(CURRENT_PUBLISHED_PRACTICE_REVISIONS.length);
    expect(result.questionCount).toBe(
      CURRENT_PUBLISHED_PRACTICE_REVISIONS.reduce((sum, item) => sum + item.questionCount, 0),
    );
    expect(result.archivedTmuaPaperCount).toBe(18);
    expect(ARCHIVED_TMUA_PAPER_IDS).toHaveLength(18);
  });

  it("fails when any archived TMUA paper disappears from the release manifest", async () => {
    const missing = CURRENT_PUBLISHED_PRACTICE_REVISIONS.filter(
      (item) => item.paperId !== ARCHIVED_TMUA_PAPER_IDS[0],
    );

    await expect(verifyRemotePracticeCatalog(missing, async () => null))
      .rejects.toThrow("omitted archived TMUA papers");
  });

  it("fails when a remote public payload exposes a protected answer field", async () => {
    const firstRevision = CURRENT_PUBLISHED_PRACTICE_REVISIONS[0]!;
    const firstPayload = structuredClone(payloadByRevision.get(firstRevision.paperRevisionId)) as {
      questions: Record<string, unknown>[];
    };
    firstPayload.questions[0] = { ...firstPayload.questions[0], correctAnswer: "A" };

    await expect(verifyRemotePracticeCatalog(
      CURRENT_PUBLISHED_PRACTICE_REVISIONS,
      async (expected) => expected.paperRevisionId === firstRevision.paperRevisionId
        ? firstPayload
        : payloadByRevision.get(expected.paperRevisionId),
    )).rejects.toThrow("越过了公开题面边界");
  });
});
