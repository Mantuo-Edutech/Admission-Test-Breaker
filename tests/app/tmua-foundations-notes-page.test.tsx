import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import { EMPTY_PREPARATION_PROFILE_STORE } from "../support/empty-preparation-profile-store.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

const EMPTY_SESSION_STORE = {
  async loadCurrent() { return { session: null, issue: null }; },
  async save() { return { persisted: true }; },
  async clearCurrent() {},
};

function services(withProfile = true): AppServices {
  return {
    store: EMPTY_SESSION_STORE,
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: withProfile ? FIXED_PREPARATION_PROFILE_STORE : EMPTY_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-18T05:00:00.000Z"),
    ids: {
      sessionId: () => "ses_tmua-notes-test",
      eventId: () => "evt_tmua-notes-test",
    },
  };
}

describe("TMUA foundations notes page", () => {
  it("renders the bilingual notes, exact curriculum gaps and PDF download", async () => {
    const router = createAppRouter(["/exams/tmua/notes/foundations"], services());
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: /TMUA 基础复习笔记.*TMUA Foundations Review Notes/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /下载双语 PDF/u })).toHaveAttribute(
      "href",
      "/notes/tmua/tmua-foundations-v2.pdf",
    );
    expect(screen.getByRole("heading", { name: /你学过的课程，具体还缺什么/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AP Precalculus + AP Calculus AB/BC" })).toBeInTheDocument();
    expect(screen.getByText(/仅有 AP Calculus 不能证明前置代数与几何已经覆盖/u)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /逻辑、证明与反例.*Logic, Proof and Counterexamples/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /数列、坐标几何与三角.*Sequences, Coordinate Geometry and Trigonometry/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /真题训练与证据化复盘.*Past-paper Training and Evidence-based Review/u })).toBeInTheDocument();
    expect(screen.getAllByText("WORKED EXAMPLE")).toHaveLength(9);
    expect(screen.getByRole("heading", { name: /15 分钟主动回忆检查/u })).toBeInTheDocument();
  });

  it("keeps the direct notes route behind the profile-first step", async () => {
    const router = createAppRouter(["/exams/tmua/notes/foundations"], services(false));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "请先填写课程信息" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /TMUA 基础复习笔记/u })).not.toBeInTheDocument();
  });

  it("links to the available first edition from the resources page", async () => {
    const router = createAppRouter(["/exams/tmua/resources"], services());
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /TMUA 基础复习笔记/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "阅读基础笔记" })).toHaveAttribute(
      "href",
      "/exams/tmua/notes/foundations",
    );
  });
});
