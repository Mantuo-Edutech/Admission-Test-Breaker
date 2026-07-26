import { readFile } from "node:fs/promises";
import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import { parseTmuaSixWeekPlan } from "../../src/features/entitled-content/domain.js";
import type { EntitledContentResult } from "../../src/features/entitled-content/domain.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

let canonicalPlan: ReturnType<typeof parseTmuaSixWeekPlan>;

beforeAll(async () => {
  canonicalPlan = parseTmuaSixWeekPlan(JSON.parse(
    await readFile("content/notes/tmua/six-week-review-plan-v1.json", "utf8"),
  ));
});

function services(result: EntitledContentResult): AppServices {
  return {
    store: {
      async loadCurrent() { return { session: null, issue: null }; },
      async save() { return { persisted: true }; },
      async clearCurrent() {},
    },
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-18T19:00:00.000Z"),
    ids: { sessionId: () => "ses_plan", eventId: () => "evt_plan" },
    entitledContent: { configured: true, async load() { return result; } },
  };
}

describe("TMUA invite-bound six-week plan", () => {
  it("shows the exact product promise but no private body to a locked account", async () => {
    const router = createAppRouter(
      ["/exams/tmua/notes/six-week-plan"],
      services({ status: "locked" }),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: /TMUA Six-Week Precision Training Plan.*TMUA 六周精确训练计划/u })).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Get an invitation code.*添加冰冰，获取邀请码/u })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /精确运算与代数底座/u })).not.toBeInTheDocument();
  });

  it("renders all six weeks only after the backend returns the entitled payload", async () => {
    const router = createAppRouter(
      ["/exams/tmua/notes/six-week-plan"],
      services({
        status: "available",
        resource: {
          id: canonicalPlan.id,
          title: canonicalPlan.titleZh,
          revision: 1,
          metadata: {},
          sourceSha256: "4f727b10e93a96e5fef3821476a9c1bd2c115738a6d055f6bcdf1c068c415088",
          payload: canonicalPlan,
        },
      }),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Exact Arithmetic and Algebra.*精确运算与代数底座/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Simulation, Correction and Taper.*模拟、修正与考前收束/u })).toBeInTheDocument();
    expect(document.querySelectorAll(".entitled-plan-sessions > li")).toHaveLength(30);
    expect(screen.getAllByText(/EVIDENCE/u, { selector: ".entitled-plan-sessions small" })).toHaveLength(30);
    expect(screen.getByRole("heading", { name: /Five Errors, Five Different Responses.*不是‘粗心’，而是五种不同问题/u })).toBeInTheDocument();
    expect(screen.getByText(/Eliminate recurring errors in surds, fractions, factorisation/u)).toBeInTheDocument();
    expect(screen.getByText(/Complete two 75-minute papers in the official order/u)).toBeInTheDocument();
    expect(screen.getByText(/不会在样本不足时给出录取概率或伪精确百分位/u)).toBeInTheDocument();
  });
});
