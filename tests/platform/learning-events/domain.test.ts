import { describe, expect, it } from "vitest";
import {
  appendLearningEvent,
  type PracticeLearningEventDraft,
} from "../../../src/platform/learning-events/domain.js";

const startedDraft: PracticeLearningEventDraft = {
  id: "evt_session-started",
  learningSpaceId: "lsp_student-one",
  sessionId: "ses_tmua-one",
  type: "session_started",
  actor: { kind: "student", userId: "usr_student-one" },
  occurredAt: "2026-07-13T09:00:00.000Z",
  payload: {
    paperId: "tmua-2023-p1",
    deadlineAt: "2026-07-13T10:15:00.000Z",
  },
};

const selectedDraft: PracticeLearningEventDraft = {
  id: "evt_answer-one",
  learningSpaceId: "lsp_student-one",
  sessionId: "ses_tmua-one",
  type: "answer_selected",
  actor: { kind: "student", userId: "usr_student-one" },
  occurredAt: "2026-07-13T09:01:00.000Z",
  payload: { questionId: "tmua-2023-p1-q01", answer: "F" },
};

const lifecycleDrafts: PracticeLearningEventDraft[] = [
  {
    ...selectedDraft,
    id: "evt_paused",
    type: "session_paused",
    payload: { reason: "visibility_hidden" },
  },
  {
    ...selectedDraft,
    id: "evt_resumed",
    type: "session_resumed",
    payload: { reason: "visibility_visible" },
  },
];

const boundaryCases: Array<{
  label: string;
  draft: PracticeLearningEventDraft;
}> = [
  {
    label: "learning space",
    draft: { ...selectedDraft, learningSpaceId: "lsp_student-two" },
  },
  {
    label: "session",
    draft: { ...selectedDraft, sessionId: "ses_tmua-two" },
  },
];

describe("learning event ledger", () => {
  it("assigns schema version and consecutive session sequence numbers", () => {
    const first = appendLearningEvent([], startedDraft);
    const second = appendLearningEvent(first.events, selectedDraft);

    expect(first.status).toBe("appended");
    expect(first.event).toMatchObject({ schemaVersion: 1, sequence: 1 });
    expect(second.event).toMatchObject({ schemaVersion: 1, sequence: 2 });
    expect(second.events).toHaveLength(2);
  });

  it("accepts a local Guest actor in its Guest learning space", () => {
    const result = appendLearningEvent([], {
      ...startedDraft,
      id: "evt_guest-session-started",
      learningSpaceId: "gsp_browser-one",
      sessionId: "ses_guest-one",
      actor: { kind: "guest", actorId: "guest_browser-one" },
    });

    expect(result.event).toMatchObject({
      learningSpaceId: "gsp_browser-one",
      actor: { kind: "guest", actorId: "guest_browser-one" },
    });
  });

  it("is idempotent when the same event ID carries the same event", () => {
    const first = appendLearningEvent([], startedDraft);
    const repeated = appendLearningEvent(first.events, startedDraft);

    expect(repeated).toEqual({
      status: "duplicate",
      event: first.event,
      events: first.events,
    });
  });

  it("rejects a repeated event ID with different content", () => {
    const first = appendLearningEvent([], selectedDraft);

    expect(() =>
      appendLearningEvent(first.events, {
        ...selectedDraft,
        payload: { questionId: "tmua-2023-p1-q01", answer: "A" },
      }),
    ).toThrow(/idempotency conflict/);
  });

  it.each(boundaryCases)("rejects an event from a different $label", ({ draft }) => {
    const first = appendLearningEvent([], startedDraft);
    expect(() => appendLearningEvent(first.events, draft)).toThrow(
      /same learning space and session/,
    );
  });

  it("rejects non-canonical event times", () => {
    expect(() =>
      appendLearningEvent([], {
        ...startedDraft,
        occurredAt: "2026-07-13T17:00:00+08:00",
      }),
    ).toThrow(/UTC timestamp/);
  });

  it("rejects negative active question time", () => {
    expect(() =>
      appendLearningEvent([], {
        ...selectedDraft,
        id: "evt_bad-time",
        type: "question_time_recorded",
        payload: { questionId: "tmua-2023-p1-q01", activeMs: -1 },
      }),
    ).toThrow(/activeMs/);
  });

  it("rejects arbitrary fields in a purposeful event payload", () => {
    expect(() =>
      appendLearningEvent([], {
        ...selectedDraft,
        payload: {
          questionId: "tmua-2023-p1-q01",
          answer: "F",
          deviceFingerprint: "not-allowed",
        },
      } as PracticeLearningEventDraft),
    ).toThrow(/unexpected payload field/);
  });

  it.each(lifecycleDrafts)("accepts an exact $type payload", (draft) => {
    expect(appendLearningEvent([], draft).event).toMatchObject({
      type: draft.type,
      payload: draft.payload,
    });
  });

  it.each(lifecycleDrafts)(
    "rejects arbitrary fields in a $type payload",
    (draft) => {
      expect(() =>
        appendLearningEvent([], {
          ...draft,
          payload: { ...draft.payload, hiddenDurationMs: 1 },
        } as unknown as PracticeLearningEventDraft),
      ).toThrow(/unexpected payload field/);
    },
  );
});
