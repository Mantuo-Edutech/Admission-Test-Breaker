import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../../src/features/practice/storage/store.js";
import type { PracticeSession } from "../../src/features/practice/domain/session.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";

class TrackingStore implements PracticeSessionStore {
  loadCalls = 0;
  saveCalls = 0;

  async loadCurrent(): Promise<SessionLoadResult> {
    this.loadCalls += 1;
    return { session: null, issue: null };
  }

  async save(_session: PracticeSession): Promise<SessionSaveResult> {
    this.saveCalls += 1;
    return { persisted: true };
  }

  async clearCurrent(): Promise<void> {}
}

function services(store: PracticeSessionStore): AppServices {
  return {
    store,
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    now: () => new Date("2026-07-13T09:00:00.000Z"),
    ids: {
      sessionId: () => "ses_landing-test",
      eventId: () => "evt_landing-test",
    },
  };
}

describe("Mantou multi-exam homepage", () => {
  it("states the brand promise and complete product meaning first", async () => {
    const router = createAppRouter(["/"], services(new TrackingStore()));
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "不再为升学考试而焦虑",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("满托考试练习场")).toBeInTheDocument();
    expect(screen.getByText("Admission Test Breaker")).toBeInTheDocument();
    expect(
      screen.getByText(
        "从了解考试、诊断水平，到系统训练、模考复盘和准备进度判断，都在这里完成。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "你正在准备哪一项考试？" }),
    ).toBeInTheDocument();
  });

  it("shows four direct exam entries with honest status text", async () => {
    const router = createAppRouter(["/"], services(new TrackingStore()));
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "不再为升学考试而焦虑" });
    for (const [name, href] of [
      ["TMUA", "/exams/tmua"],
      ["ESAT", "/exams/esat"],
      ["TARA", "/exams/tara"],
      ["UCAT", "/exams/ucat"],
    ] as const) {
      expect(screen.getByRole("link", { name: new RegExp(name, "u") })).toHaveAttribute(
        "href",
        href,
      );
    }
    expect(screen.getByText("现已开放")).toBeInTheDocument();
    expect(screen.getAllByText("资料馆建设中")).toHaveLength(3);
  });

  it("presents the common preparation path in order", async () => {
    const router = createAppRouter(["/"], services(new TrackingStore()));
    render(<RouterProvider router={router} />);

    const path = await screen.findByRole("list", { name: "完整备考路径" });
    expect(
      within(path).getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "了解考试",
      "完成诊断",
      "系统训练",
      "模考复盘",
      "判断准备进度",
    ]);
  });

  it("removes the old abstract and single-paper homepage copy", async () => {
    const router = createAppRouter(["/"], services(new TrackingStore()));
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", { name: "不再为升学考试而焦虑" });

    for (const oldCopy of [
      "把焦虑，拆成每一道题。",
      "知识不是围墙",
      "内容有出处",
      "结论保持诚实",
      "练习保持开放 · 深度解读与专业服务由你选择",
    ]) {
      expect(screen.queryByText(new RegExp(oldCopy, "u"))).not.toBeInTheDocument();
    }
  });

  it("does not read or create a private practice session on the public homepage", async () => {
    const store = new TrackingStore();
    const router = createAppRouter(["/"], services(store));
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", { name: "不再为升学考试而焦虑" });

    expect(store.loadCalls).toBe(0);
    expect(store.saveCalls).toBe(0);
  });

  it("routes the open TMUA entry to its own exam space", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(["/"], services(new TrackingStore()));
    render(<RouterProvider router={router} />);

    document.documentElement.scrollTop = 640;
    document.body.scrollTop = 640;

    await user.click(
      await screen.findByRole("link", { name: /TMUA.*现已开放/u }),
    );
    expect(router.state.location.pathname).toBe("/exams/tmua");
    expect(
      await screen.findByRole("heading", { name: "TMUA 备考中心" }),
    ).toBeInTheDocument();
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });
});
