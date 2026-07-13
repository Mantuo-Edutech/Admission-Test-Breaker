import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import { practiceSessionReducer } from "../../src/features/practice/domain/reducer.js";
import { createPracticeSession } from "../../src/features/practice/domain/session.js";
import type { PracticeSession } from "../../src/features/practice/domain/session.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../../src/features/practice/storage/store.js";

class ResultStore implements PracticeSessionStore {
  cleared = false;

  constructor(private session: PracticeSession | null) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    return { session: this.session, issue: null };
  }

  async save(session: PracticeSession): Promise<SessionSaveResult> {
    this.session = session;
    return { persisted: true };
  }

  async clearCurrent(): Promise<void> {
    this.session = null;
    this.cleared = true;
  }
}

function submittedSession() {
  const active = createPracticeSession({
    id: "ses_result-page",
    learningSpaceId: "lsp_local-demo",
    actor: { kind: "student", userId: "usr_local-demo" },
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_result-started",
  });
  const answered = practiceSessionReducer(active, {
    type: "answer",
    eventId: "evt_result-answer",
    questionId: "tmua-2023-p1-q01",
    answer: "F",
    at: "2026-07-13T09:01:00.000Z",
  });
  return practiceSessionReducer(answered, {
    type: "submit",
    eventId: "evt_result-submit",
    timeEventId: "evt_result-time",
    at: "2026-07-13T09:10:00.000Z",
    reason: "student",
  });
}

function services(store: PracticeSessionStore): AppServices {
  return {
    store,
    now: () => new Date("2026-07-13T09:10:00.000Z"),
    ids: {
      sessionId: () => "ses_unused",
      eventId: () => "evt_unused",
    },
  };
}

describe("evidence-only results page", () => {
  it("shows deterministic score, timing, and answer-level evidence", async () => {
    const session = submittedSession();
    const router = createAppRouter(
      [`/results/${session.id}`],
      services(new ResultStore(session)),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "本次练习完成" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 20")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText("正确 1")).toBeInTheDocument();
    expect(screen.getByText("未作答 19")).toBeInTheDocument();
    expect(screen.getByText("活跃页内用时")).toBeInTheDocument();
    expect(screen.getByText(/样本积累中/)).toBeInTheDocument();
    expect(screen.getByLabelText("你的答案 F")).toBeInTheDocument();
    expect(screen.getAllByLabelText("正确答案 F")).not.toHaveLength(0);
    expect(screen.queryByText(/预测分数/)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI 深度解读/)).not.toBeInTheDocument();
  });

  it("clears the local session before starting again", async () => {
    const user = userEvent.setup();
    const session = submittedSession();
    const store = new ResultStore(session);
    const router = createAppRouter(
      [`/results/${session.id}`],
      services(store),
    );
    render(<RouterProvider router={router} />);

    await user.click(
      await screen.findByRole("button", { name: "重新练习这份试卷" }),
    );
    expect(store.cleared).toBe(true);
    expect(router.state.location.pathname).toBe("/exams/tmua");
  });

  it("does not expose an active or mismatched result session", async () => {
    const active = createPracticeSession({
      id: "ses_still-active",
      learningSpaceId: "lsp_local-demo",
      actor: { kind: "student", userId: "usr_local-demo" },
      startedAt: "2026-07-13T09:00:00.000Z",
      eventId: "evt_still-active",
    });
    const router = createAppRouter(
      ["/results/ses_someone-else"],
      services(new ResultStore(active)),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "这份结果暂时不可用" }),
    ).toBeInTheDocument();
  });
});
