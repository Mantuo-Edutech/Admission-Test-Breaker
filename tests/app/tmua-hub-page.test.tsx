import { render, screen, waitFor, within } from "@testing-library/react";
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

class HubSessionStore implements PracticeSessionStore {
  saved: PracticeSession | null = null;

  constructor(
    private readonly loaded: SessionLoadResult = { session: null, issue: null },
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
      sessionId: () => "ses_tmua-hub-test",
      eventId: () => "evt_tmua-hub-test",
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

describe("TMUA exam space", () => {
  it("presents the learner journey honestly and in order", async () => {
    const router = createAppRouter(
      ["/exams/tmua"],
      services(new HubSessionStore()),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "TMUA 备考中心" }),
    ).toBeInTheDocument();
    const journey = screen.getByRole("list", { name: "TMUA 完整备考路径" });
    const steps = within(journey).getAllByRole("listitem");
    expect(steps.map((step) => step.querySelector("h3")?.textContent)).toEqual([
      "先做 5 道题，看看 TMUA 有多难",
      "完成约 30 分钟初步诊断",
      "2023 Paper 1 完整练习",
      "历年真题资料馆",
      "哪些学校和专业需要 TMUA",
    ]);
    expect(within(steps[0]!).getByText("即将开放")).toBeInTheDocument();
    expect(within(steps[1]!).getByText("即将开放")).toBeInTheDocument();
    expect(within(steps[4]!).getByText("申请要求整理中")).toBeInTheDocument();
    expect(
      within(steps[0]!).queryByRole("link"),
    ).not.toBeInTheDocument();
    expect(
      within(steps[1]!).queryByRole("button"),
    ).not.toBeInTheDocument();
    expect(within(steps[3]!).getByRole("link")).toHaveAttribute(
      "href",
      "#past-papers",
    );
  });

  it("renders all verified archive facts and only links published content", async () => {
    const router = createAppRouter(
      ["/exams/tmua"],
      services(new HubSessionStore()),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "TMUA 备考中心" });
    expect(screen.getByText("18 套试卷")).toBeInTheDocument();
    expect(screen.getByText("360 道题目档案")).toBeInTheDocument();
    expect(screen.getByText("20 道已可在线练习")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "TMUA 历年真题资料馆" });
    expect(within(table).getAllByRole("row")).toHaveLength(19);
    expect(within(table).getAllByText("已建立档案")).toHaveLength(17);
    expect(within(table).getByText("可在线练习")).toBeInTheDocument();
    const links = within(table).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/practice/tmua-2023-paper-1");
    expect(within(table).getByText("Early specimen")).toBeInTheDocument();
    expect(within(table).getByText("2016 Practice")).toBeInTheDocument();
  });

  it("starts a learner-owned session before entering the full paper", async () => {
    const user = userEvent.setup();
    const store = new HubSessionStore();
    const router = createAppRouter(["/exams/tmua"], services(store));
    render(<RouterProvider router={router} />);

    document.documentElement.scrollTop = 920;
    document.body.scrollTop = 920;

    await user.click(
      await screen.findByRole("button", {
        name: "开始 2023 Paper 1 完整练习",
      }),
    );
    expect(store.saved).toMatchObject({
      id: "ses_tmua-hub-test",
      learnerSpaceId: "lsp_local-demo",
      status: "active",
    });
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-paper-1");
    await waitFor(() => {
      expect(document.documentElement.scrollTop).toBe(0);
      expect(document.body.scrollTop).toBe(0);
    });
  });

  it("detects and resumes an active session with visible progress", async () => {
    const user = userEvent.setup();
    const store = new HubSessionStore({ session: activeSession(), issue: null });
    const router = createAppRouter(["/exams/tmua"], services(store));
    render(<RouterProvider router={router} />);

    expect(await screen.findByText("已完成 1 / 20")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "继续 2023 Paper 1" }));
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-paper-1");
  });

  it("shows corrupt data calmly and can continue when persistence is unavailable", async () => {
    const user = userEvent.setup();
    const store = new HubSessionStore(
      { session: null, issue: "corrupt" },
      { persisted: false },
    );
    const router = createAppRouter(["/exams/tmua"], services(store));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "上次练习记录无法安全恢复",
    );
    await user.click(
      screen.getByRole("button", { name: "开始 2023 Paper 1 完整练习" }),
    );
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-paper-1");
    expect(router.state.location.state).toEqual({ recoveryWarning: true });
  });
});
