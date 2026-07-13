import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import { createPracticeSession } from "../../src/features/practice/domain/session.js";
import type { PracticeSession } from "../../src/features/practice/domain/session.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../../src/features/practice/storage/store.js";
import {
  FIXED_GUEST_SPACE,
  FIXED_GUEST_SPACE_STORE,
} from "../support/fixed-guest-space-store.js";

class PracticeStore implements PracticeSessionStore {
  saves: PracticeSession[] = [];

  constructor(private session: PracticeSession | null) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    return { session: this.session, issue: null };
  }

  async save(session: PracticeSession): Promise<SessionSaveResult> {
    this.session = session;
    this.saves.push(session);
    return { persisted: true };
  }

  async clearCurrent(): Promise<void> {
    this.session = null;
  }
}

function activeSession() {
  return createPracticeSession({
    id: "ses_practice-test",
    learningSpaceId: FIXED_GUEST_SPACE.id,
    actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    startedAt: "2026-07-13T09:00:00.000Z",
    eventId: "evt_practice-started",
  });
}

function appServices(store: PracticeSessionStore): AppServices {
  let eventNumber = 0;
  return {
    store,
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    now: () => new Date("2026-07-13T09:05:00.000Z"),
    ids: {
      sessionId: () => "ses_unused",
      eventId: () => `evt_practice-${++eventNumber}`,
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("responsive TMUA practice page", () => {
  it("pauses timing while the page is hidden and resumes when visible", async () => {
    const store = new PracticeStore(activeSession());
    const visibility = vi.spyOn(document, "visibilityState", "get");
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", { name: "第 1 题" });

    visibility.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => {
      expect(store.saves.at(-1)?.activeQuestionEnteredAt).toBeNull();
      expect(store.saves.at(-1)?.events.at(-1)?.type).toBe("session_paused");
    });

    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => {
      expect(store.saves.at(-1)?.activeQuestionEnteredAt).not.toBeNull();
      expect(store.saves.at(-1)?.events.at(-1)?.type).toBe("session_resumed");
    });
  });

  it("answers, marks, and navigates without revealing the answer", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeSession());
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "第 1 题" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /选项 F/ }));
    expect(screen.getByText("已作答 1 / 20")).toBeInTheDocument();
    expect(screen.queryByText(/正确答案/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "标记本题" }));
    expect(screen.getByRole("button", { name: "取消标记" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下一题" }));
    expect(
      await screen.findByRole("heading", { name: "第 2 题" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(store.saves.length).toBeGreaterThan(0));
  });

  it("shows deliberate submission counts and finalizes into the result route", async () => {
    const user = userEvent.setup();
    const store = new PracticeStore(activeSession());
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(store),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "第 1 题" });
    await user.click(screen.getByRole("radio", { name: /选项 F/ }));
    await user.click(screen.getByRole("button", { name: "提交试卷" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("未作答 19 题");
    await user.click(screen.getByRole("button", { name: "确认提交" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/results/ses_practice-test",
      ),
    );
    expect(store.saves.at(-1)?.status).toBe("submitted");
  });

  it("shows a calm recovery state when no local session exists", async () => {
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      appServices(new PracticeStore(null)),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "这里没有可继续的练习" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回练习首页" })).toHaveAttribute(
      "href",
      "/exams/tmua",
    );
  });
});
