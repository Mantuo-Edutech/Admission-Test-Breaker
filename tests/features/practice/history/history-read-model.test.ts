import { describe, expect, it } from "vitest";
import { UCAT_QUANTITATIVE_REASONING_STARTER } from "../../../../src/features/practice/content/ucat-quantitative-reasoning-starter.js";
import { practiceSessionReducer } from "../../../../src/features/practice/domain/reducer.js";
import { createPracticeSession } from "../../../../src/features/practice/domain/session.js";
import { buildPracticeHistoryView } from "../../../../src/features/practice/history/history-read-model.js";
import { TestPracticeDeliveryService } from "../../../../src/features/practice/delivery/test-practice-delivery-service.js";
import type { PracticeSession } from "../../../../src/features/practice/domain/session.js";

function completedQrSession() {
  const paper = UCAT_QUANTITATIVE_REASONING_STARTER;
  let session = createPracticeSession({
    id: "ses_history-model-qr",
    learningSpaceId: "gsp_history-model",
    actor: { kind: "guest", actorId: "guest_history-model" },
    paperId: paper.id,
    durationMinutes: paper.durationMinutes,
    startedAt: "2026-07-18T10:00:00.000Z",
    eventId: "evt_history-model-start",
  });
  session = practiceSessionReducer(session, {
    type: "answer",
    eventId: "evt_history-model-q1",
    questionId: paper.questions[0]!.id,
    answer: paper.questions[0]!.correctAnswer,
    at: "2026-07-18T10:01:00.000Z",
  });
  session = practiceSessionReducer(session, {
    type: "view",
    eventId: "evt_history-model-view-q2",
    timeEventId: "evt_history-model-q1-time",
    questionNumber: 2,
    at: "2026-07-18T10:02:00.000Z",
  });
  session = practiceSessionReducer(session, {
    type: "answer",
    eventId: "evt_history-model-q2-wrong",
    questionId: paper.questions[1]!.id,
    answer: "A",
    at: "2026-07-18T10:02:30.000Z",
  });
  session = practiceSessionReducer(session, {
    type: "answer",
    eventId: "evt_history-model-q2-change",
    questionId: paper.questions[1]!.id,
    answer: paper.questions[1]!.correctAnswer,
    at: "2026-07-18T10:03:00.000Z",
  });
  return practiceSessionReducer(session, {
    type: "submit",
    eventId: "evt_history-model-submit",
    timeEventId: "evt_history-model-q2-time",
    at: "2026-07-18T10:04:00.000Z",
    reason: "student",
  });
}

describe("practice history evidence read model", () => {
  async function materialsFor(session: PracticeSession, includeResults = true) {
    const delivery = new TestPracticeDeliveryService();
    const paper = await delivery.loadPaper(session.paperId);
    if (paper === null) throw new Error("Missing test paper");
    return new Map([[session.id, {
      paper,
      results: includeResults ? await delivery.score(session) : null,
    }]]);
  }

  it("derives frequency, time, changes, module results and topic facts without a benchmark", async () => {
    const session = completedQrSession();
    const view = buildPracticeHistoryView(
      [session],
      "ucat",
      new Date("2026-07-18T12:00:00.000Z"),
      await materialsFor(session),
    );

    expect(view).toMatchObject({
      totalSessions: 1,
      completedSessions: 1,
      activeDaysLast30: 1,
      sessionsLast30: 1,
      totalActiveMs: 240_000,
      totalAnswerChanges: 1,
    });
    expect(view.entries[0]).toMatchObject({
      answeredCount: 2,
      totalQuestions: 10,
      score: 2,
      maxScore: 10,
      percentage: 20,
      resultHref: "/results/ses_history-model-qr",
    });
    expect(view.modules).toEqual([
      expect.objectContaining({ attempts: 1, completed: 1, averagePercentage: 20 }),
    ]);
    expect(view.topics.some((topic) => topic.attemptedCount > 0)).toBe(true);
    expect(view.topics.every((topic) => topic.label.includes(" · "))).toBe(true);
    expect(view.topics.some((topic) => topic.label.startsWith("数量推理："))).toBe(true);
  });

  it("filters another exam instead of mixing evidence", async () => {
    const session = completedQrSession();
    expect(buildPracticeHistoryView(
      [session],
      "lnat",
      new Date("2026-07-18T12:00:00.000Z"),
      await materialsFor(session),
    ).entries).toEqual([]);
  });

  it("never recalculates a historical result against a different content revision", async () => {
    const historical = {
      ...completedQrSession(),
      paperRevisionId: "ucat-quantitative-reasoning-starter-v1-r99",
      contentDigest: "0".repeat(64),
    };

    const view = buildPracticeHistoryView(
      [historical],
      "ucat",
      new Date("2026-07-18T12:00:00.000Z"),
      await materialsFor(historical, false),
    );

    expect(view.entries[0]).toMatchObject({
      contentAvailable: false,
      statusLabel: "原内容版本待恢复",
      score: null,
      maxScore: null,
      percentage: null,
      resultHref: null,
    });
    expect(view.topics).toEqual([]);
  });
});
