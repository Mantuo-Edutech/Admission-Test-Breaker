import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../../src/features/practice/storage/store.js";
import type { PracticeSession } from "../../src/features/practice/domain/session.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { EMPTY_PREPARATION_PROFILE_STORE } from "../support/empty-preparation-profile-store.js";

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
    profileStore: EMPTY_PREPARATION_PROFILE_STORE,
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
        "选择考试，填写课程信息，查看需要补充的知识，然后完成诊断与真题练习。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "你正在准备哪一项考试？" }),
    ).toBeInTheDocument();
  });

  it("shows five direct exam entries with useful course context", async () => {
    const router = createAppRouter(["/"], services(new TrackingStore()));
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "不再为升学考试而焦虑" });
    for (const [name, href] of [
      ["TMUA", "/exams/tmua"],
      ["ESAT", "/exams/esat"],
      ["TARA", "/exams/tara"],
      ["LNAT", "/exams/lnat"],
      ["UCAT", "/exams/ucat"],
    ] as const) {
      expect(screen.getByRole("link", { name: new RegExp(name, "u") })).toHaveAttribute(
        "href",
        href,
      );
    }
    for (const description of [
      "数学、计算机、经济及相关量化专业",
      "工程、自然科学、化学与生命科学相关专业",
      "人文、社会科学及部分跨学科专业",
      "法学及相关本科专业",
      "医学、牙科及相关临床专业",
    ]) {
      expect(screen.getByText(description)).toBeInTheDocument();
    }
    expect(screen.queryByText(/在线真题|专业要求|官方资料已整理/u)).not.toBeInTheDocument();
  });

  it("presents the common preparation path in order", async () => {
    const router = createAppRouter(["/"], services(new TrackingStore()));
    render(<RouterProvider router={router} />);

    const path = await screen.findByRole("list", { name: "完整备考路径" });
    expect(
      within(path).getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "选择考试",
      "填写课程信息",
      "查看知识差距",
      "完成诊断与真题",
      "跟踪准备进度",
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
    const appServices = services(new TrackingStore());
    const track = vi.fn(async () => undefined);
    appServices.funnel = { track };
    const router = createAppRouter(["/"], appServices);
    render(<RouterProvider router={router} />);

    document.documentElement.scrollTop = 640;
    document.body.scrollTop = 640;

    await user.click(
      await screen.findByRole("link", { name: /TMUA.*数学、计算机、经济/u }),
    );
    expect(router.state.location.pathname).toBe("/exams/tmua");
    expect(
      await screen.findByRole("heading", { name: /先了解起点.*再开始练习/u }),
    ).toBeInTheDocument();
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
    expect(track).toHaveBeenCalledWith({
      eventType: "exam_selected",
      examId: "tmua",
      contextCode: "home-exam-selector",
    });
  });
});
