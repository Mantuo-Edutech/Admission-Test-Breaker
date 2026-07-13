import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import { createPracticeSession } from "../../src/features/practice/domain/session.js";
import type { PracticeSession } from "../../src/features/practice/domain/session.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../../src/features/practice/storage/store.js";

class FakeSessionStore implements PracticeSessionStore {
  saved: PracticeSession | null = null;

  constructor(
    private readonly loaded: SessionLoadResult = {
      session: null,
      issue: null,
    },
    private readonly saveResult: SessionSaveResult = { persisted: true },
  ) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    return this.saved === null
      ? this.loaded
      : { session: this.saved, issue: null };
  }

  async save(session: PracticeSession): Promise<SessionSaveResult> {
    this.saved = session;
    return this.saveResult;
  }

  async clearCurrent(): Promise<void> {
    this.saved = null;
  }
}

function services(store: PracticeSessionStore): AppServices {
  return {
    store,
    now: () => new Date("2026-07-13T09:00:00.000Z"),
    ids: {
      sessionId: () => "ses_landing-test",
      eventId: () => "evt_landing-test",
    },
  };
}

function activeSession(): PracticeSession {
  return {
    ...createPracticeSession({
      id: "ses_resume-test",
      learnerSpaceId: "lsp_local-demo",
      actor: { kind: "student", userId: "usr_local-demo" },
      startedAt: "2026-07-13T08:30:00.000Z",
      eventId: "evt_resume-started",
    }),
    answers: { "tmua-2023-p1-q01": "F" },
  };
}

describe("TMUA Reference Journey landing page", () => {
  it("shows the complete paper facts and honest local-data boundary", async () => {
    const router = createAppRouter(
      ["/"],
      services(new FakeSessionStore()),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "把焦虑，拆成每一道题。" }),
    ).toBeInTheDocument();
    expect(screen.getByText("20 道题")).toBeInTheDocument();
    expect(screen.getByText("75 分钟")).toBeInTheDocument();
    expect(screen.getByText("不可使用计算器")).toBeInTheDocument();
    expect(screen.getByText(/当前设备保存/)).toBeInTheDocument();
    expect(screen.getAllByText(/由满托发起/)).not.toHaveLength(0);
  });

  it("starts a learner-owned session and navigates into the paper", async () => {
    const user = userEvent.setup();
    const store = new FakeSessionStore();
    const router = createAppRouter(["/"], services(store));
    render(<RouterProvider router={router} />);

    await user.click(
      await screen.findByRole("button", { name: "开始完整模考" }),
    );

    expect(router.state.location.pathname).toBe(
      "/practice/tmua-2023-paper-1",
    );
    expect(store.saved).toMatchObject({
      id: "ses_landing-test",
      learnerSpaceId: "lsp_local-demo",
      status: "active",
    });
  });

  it("offers a separate resume action with answered progress", async () => {
    const user = userEvent.setup();
    const store = new FakeSessionStore({
      session: activeSession(),
      issue: null,
    });
    const router = createAppRouter(["/"], services(store));
    render(<RouterProvider router={router} />);

    expect(await screen.findByText("已完成 1 / 20")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "继续上次练习" }));
    expect(router.state.location.pathname).toBe(
      "/practice/tmua-2023-paper-1",
    );
  });

  it("does not show resume when no active session exists", async () => {
    const router = createAppRouter(
      ["/"],
      services(new FakeSessionStore()),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("button", { name: "开始完整模考" });
    expect(
      screen.queryByRole("button", { name: "继续上次练习" }),
    ).not.toBeInTheDocument();
  });

  it("surfaces corrupt recovery data calmly", async () => {
    const router = createAppRouter(
      ["/"],
      services(
        new FakeSessionStore({ session: null, issue: "corrupt" }),
      ),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "上次练习记录无法安全恢复",
    );
  });

  it("continues in memory when browser persistence is unavailable", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(
      ["/"],
      services(
        new FakeSessionStore(
          { session: null, issue: null },
          { persisted: false },
        ),
      ),
    );
    render(<RouterProvider router={router} />);

    await user.click(
      await screen.findByRole("button", { name: "开始完整模考" }),
    );

    expect(router.state.location.state).toEqual({
      recoveryWarning: true,
    });
  });
});
