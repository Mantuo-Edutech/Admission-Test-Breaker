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

    expect(await screen.findByRole("heading", { level: 1, name: /TMUA Foundations Review Notes.*TMUA 基础复习笔记/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download bilingual PDF.*下载双语 PDF/u })).toHaveAttribute(
      "href",
      "/notes/tmua/tmua-foundations-v2.pdf",
    );
    expect(screen.getByRole("heading", { name: /What Is Covered — and What Still Needs Checking\?.*你学过的课程，具体还缺什么/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AP Precalculus + AP Calculus AB/BC" })).toBeInTheDocument();
    expect(screen.getByText(/AP Calculus alone does not demonstrate/u)).toHaveAttribute("lang", "en");
    expect(screen.getByText(/The same wrong answer can require completely different repairs/u)).toHaveAttribute("lang", "en");
    expect(screen.getByText(/The concept, formula or condition of use is unknown/u)).toHaveAttribute("lang", "en");
    expect(screen.getByRole("heading", { name: /Logic, Proof and Counterexamples.*逻辑、证明与反例/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Sequences, Coordinate Geometry and Trigonometry.*数列、坐标几何与三角/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Past-paper Training and Evidence-based Review.*真题训练与证据化复盘/u })).toBeInTheDocument();
    expect(screen.getAllByText("WORKED EXAMPLE")).toHaveLength(9);
    expect(screen.getByRole("heading", { name: /15-minute Active Recall Check.*15 分钟主动回忆检查/u })).toBeInTheDocument();
  });

  it("keeps the direct notes route behind the profile-first step", async () => {
    const router = createAppRouter(["/exams/tmua/notes/foundations"], services(false));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Complete your course profile first.*请先填写课程信息/u })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /TMUA 基础复习笔记/u })).not.toBeInTheDocument();
  });

  it("links to the available first edition from the resources page", async () => {
    const router = createAppRouter(["/exams/tmua/resources"], services());
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /TMUA Foundations Review Notes.*TMUA 基础复习笔记/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read foundation notes.*阅读基础笔记/u })).toHaveAttribute(
      "href",
      "/exams/tmua/notes/foundations",
    );
  });
});
