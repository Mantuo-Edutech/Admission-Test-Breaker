import type { SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { createPracticeSession, type PracticeSession } from "../../../../src/features/practice/domain/session.js";
import { SupabasePracticeDeliveryService } from "../../../../src/features/practice/delivery/supabase-practice-delivery-service.js";
import { mergeImmutableRevisionPackages } from "../../../../scripts/lib/practice-paper-packages.js";

async function tmuaPayload(): Promise<unknown> {
  const artifact = JSON.parse(
    await readFile("content/practice/server-delivery/public-paper-payloads.json", "utf8"),
  ) as { packages: Array<{ paperRevisionId: string; payload: unknown }> };
  return artifact.packages.find((item) => item.paperRevisionId === "tmua-2023-p1-r1")?.payload;
}

function client(handler: (name: string, input: unknown) => unknown): SupabaseClient {
  return {
    rpc: vi.fn(async (name: string, input: unknown) => ({ data: handler(name, input), error: null })),
  } as unknown as SupabaseClient;
}

function submittedSession(): PracticeSession {
  return {
    ...createPracticeSession({
      id: "ses_delivery_test",
      learningSpaceId: "gsp_delivery_test",
      actor: { kind: "guest", actorId: "guest_delivery_test" },
      paperId: "tmua-2023-p1",
      durationMinutes: 75,
      startedAt: "2026-07-23T12:00:00.000Z",
      eventId: "evt_delivery_start",
    }),
    status: "submitted",
    submittedAt: "2026-07-23T12:10:00.000Z",
    activeQuestionEnteredAt: null,
  };
}

describe("Supabase practice delivery", () => {
  it("retains the historical package when a new immutable revision is published", () => {
    const historical = { paperRevisionId: "paper-r1", payload: "original" };
    const current = { paperRevisionId: "paper-r2", payload: "corrected" };

    expect(
      mergeImmutableRevisionPackages(
        ["paper-r1", "paper-r2"],
        [historical],
        [current],
      ),
    ).toEqual([historical, current]);
  });

  it("refuses to publish a revision when its historical package has disappeared", () => {
    expect(() =>
      mergeImmutableRevisionPackages(
        ["paper-r1", "paper-r2"],
        [],
        [{ paperRevisionId: "paper-r2", payload: "corrected" }],
      ),
    ).toThrow("Historical practice package is missing");
  });

  it("loads one immutable public paper through the safe RPC", async () => {
    const payload = await tmuaPayload();
    const supabase = client(() => payload);
    const service = new SupabasePracticeDeliveryService(supabase);

    const paper = await service.loadPaper("tmua-2023-p1", "tmua-2023-p1-r1");
    expect(paper).toMatchObject({
      id: "tmua-2023-p1",
      contentRef: { paperRevisionId: "tmua-2023-p1-r1" },
    });
    expect(paper?.questions).toHaveLength(20);
    expect(JSON.stringify(paper)).not.toContain("correctAnswer");
    expect(supabase.rpc).toHaveBeenCalledWith("get_practice_paper", {
      p_paper_id: "tmua-2023-p1",
      p_paper_revision_id: "tmua-2023-p1-r1",
    });
  });

  it("rejects a paper response that crosses the answer-key boundary", async () => {
    const payload = structuredClone(await tmuaPayload()) as { questions: Array<Record<string, unknown>> };
    payload.questions[0]!.correctAnswer = "F";
    const service = new SupabasePracticeDeliveryService(client(() => payload));

    await expect(service.loadPaper("tmua-2023-p1"))
      .rejects.toThrow("题库服务越过了公开题面边界");
  });

  it("submits the exact revision and validates the server result", async () => {
    const session = submittedSession();
    const supabase = client((name) => {
      if (name !== "score_practice_submission") return null;
      return {
        sessionId: session.id,
        paperId: session.paperId,
        paperRevisionId: session.paperRevisionId,
        contentDigest: session.contentDigest,
        score: 0,
        maxScore: 20,
        totalQuestions: 20,
        percentage: 0,
        correctCount: 0,
        partialCount: 0,
        incorrectCount: 0,
        unansweredCount: 20,
        totalActiveMs: 0,
        averagePerQuestionMs: 0,
        longestQuestionIds: [],
        questions: [],
        topics: [],
      };
    });
    const service = new SupabasePracticeDeliveryService(supabase);

    await expect(service.score(session)).resolves.toMatchObject({ maxScore: 20 });
    expect(supabase.rpc).toHaveBeenCalledWith("score_practice_submission", {
      p_submission: session,
    });
  });
});
