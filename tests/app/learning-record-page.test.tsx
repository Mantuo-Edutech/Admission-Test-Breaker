import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import { UCAT_QUANTITATIVE_REASONING_STARTER } from "../../src/features/practice/content/ucat-quantitative-reasoning-starter.js";
import { practiceSessionReducer } from "../../src/features/practice/domain/reducer.js";
import { createPracticeSession } from "../../src/features/practice/domain/session.js";
import { LocalPracticeHistoryStore } from "../../src/features/practice/history/local-history-store.js";
import { LocalPracticeSessionStore } from "../../src/features/practice/storage/local-store.js";
import { EMPTY_PREPARATION_PROFILE_STORE } from "../support/empty-preparation-profile-store.js";
import { FIXED_GUEST_SPACE, FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";

function completedSession() {
  const paper = UCAT_QUANTITATIVE_REASONING_STARTER;
  let session = createPracticeSession({
    id: "ses_learning-record-page",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    paperId: paper.id,
    durationMinutes: paper.durationMinutes,
    startedAt: "2026-07-18T10:00:00.000Z",
    eventId: "evt_learning-record-start",
  });
  session = practiceSessionReducer(session, {
    type: "answer",
    eventId: "evt_learning-record-answer",
    questionId: paper.questions[0]!.id,
    answer: paper.questions[0]!.correctAnswer,
    at: "2026-07-18T10:01:00.000Z",
  });
  return practiceSessionReducer(session, {
    type: "submit",
    eventId: "evt_learning-record-submit",
    timeEventId: "evt_learning-record-time",
    at: "2026-07-18T10:03:00.000Z",
    reason: "student",
  });
}

function services() {
  const history = new LocalPracticeHistoryStore(globalThis.localStorage);
  const store = new LocalPracticeSessionStore(globalThis.localStorage, () => new Date(), history);
  const value: AppServices = {
    store,
    practiceHistory: history,
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: EMPTY_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-18T12:00:00.000Z"),
    ids: {
      sessionId: () => "ses_learning-record-next",
      eventId: () => "evt_learning-record-next",
    },
  };
  return { value, history, store };
}

describe("private learning record product", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("shows saved frequency, time, module and result evidence and reopens an archived result", async () => {
    const user = userEvent.setup();
    const app = services();
    await app.store.save(completedSession());
    await app.store.clearCurrent();
    const router = createAppRouter(["/exams/ucat/record"], app.value);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /UCAT 学习记录/u })).toBeInTheDocument();
    const metrics = screen.getByRole("region", { name: "UCAT 学习记录概览" });
    expect(within(metrics).getByText("完成 1 次")).toBeInTheDocument();
    expect(within(metrics).getByText("1 天")).toBeInTheDocument();
    expect(within(metrics).getByText("3 分钟")).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      name: "Quantitative Reasoning Starter · 数量推理 · 满托原创短诊断",
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      name: "数量推理：百分比下降 · Quantitative Reasoning: Percentage Decrease",
    })).toBeInTheDocument();
    expect(screen.getAllByText("1 / 10").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("最近 30 次完整练习快照", { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /查看本次结果/u }));
    expect(router.state.location.pathname).toBe("/results/ses_learning-record-page");
    expect(await screen.findByRole("heading", { name: "本次练习完成" })).toBeInTheDocument();
  });

  it("keeps another exam empty instead of mixing UCAT evidence into LNAT", async () => {
    const app = services();
    await app.history.record(completedSession());
    render(<RouterProvider router={createAppRouter(["/exams/lnat/record"], app.value)} />);

    expect(await screen.findByRole("heading", { name: /完成第一项 LNAT 在线练习后/u })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Quantitative Reasoning/u })).not.toBeInTheDocument();
  });
});
