import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import { LocalPracticeSessionStore } from "../../src/features/practice/storage/local-store.js";
import { LocalAssessmentProfileStore } from "../../src/features/preparation-profile/storage/assessment-profile-local-store.js";
import { EMPTY_PREPARATION_PROFILE_STORE } from "../support/empty-preparation-profile-store.js";
import { FIXED_GUEST_SPACE, FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";

function services(): AppServices {
  return {
    store: new LocalPracticeSessionStore(globalThis.localStorage),
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: EMPTY_PREPARATION_PROFILE_STORE,
    assessmentProfileStore: new LocalAssessmentProfileStore(globalThis.localStorage),
    now: () => new Date("2026-07-18T12:00:00.000Z"),
    ids: {
      sessionId: () => "ses_assessment-profile-test",
      eventId: () => "evt_assessment-profile-test",
    },
  };
}

describe("exam-aware profile-first practice journey", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("requires the correct exam profile before direct UCAT practice", async () => {
    const router = createAppRouter(
      ["/practice/ucat-quantitative-reasoning-starter-v1"],
      services(),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "请先填写 UCAT 背景信息" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /填写 UCAT 背景信息/u })).toHaveAttribute("href", "/exams/ucat/profile");
    expect(screen.queryByRole("heading", { name: "请先填写课程信息" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "第 1 题" })).not.toBeInTheDocument();
  });

  it("saves a minimal background profile and opens a deterministic module starting point", async () => {
    const user = userEvent.setup();
    const appServices = services();
    const router = createAppRouter(["/exams/ucat/profile"], appServices);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /填写你的 UCAT 背景/u })).toBeInTheDocument();
    await user.click(await screen.findByRole("radio", { name: /A-Level \/ IAL/u }));
    await user.click(screen.getByRole("radio", { name: "Year 12" }));
    await user.click(screen.getByRole("checkbox", { name: "Mathematics数学" }));
    await user.click(screen.getByRole("radio", { name: "看过或做过少量样题" }));
    await user.click(screen.getByRole("radio", { name: "每周 2–4 小时" }));
    await user.click(screen.getByRole("button", { name: "保存并查看 UCAT 起点定位" }));

    expect(router.state.location.pathname).toBe("/exams/ucat/preparation");
    expect(await screen.findByRole("heading", { name: /你的 UCAT 起点定位/u })).toBeInTheDocument();
    expect(screen.getByText("12–19 小时")).toBeInTheDocument();
    expect(screen.getByText("集合、条件与演绎逻辑 · Sets, conditions and deduction")).toBeInTheDocument();
    expect(screen.getAllByText("已有课程可迁移 · Transferable foundation")).toHaveLength(2);
    expect(screen.getByText("先检查基础缺口 · Foundation check")).toBeInTheDocument();
    expect(screen.getByText("课程通常不覆盖 · Exam-specific")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /进入 UCAT 免费在线练习/u })[0]).toHaveAttribute(
      "href",
      "/exams/ucat/past-papers",
    );
    await expect(appServices.assessmentProfileStore?.load(FIXED_GUEST_SPACE.id, "ucat")).resolves.toMatchObject({
      profile: {
        examId: "ucat",
        curriculumId: "a-level",
        learningStage: "year-12",
        subjectAreas: ["mathematics"],
      },
      issue: null,
    });
  });

  it("does not let a UCAT profile unlock LNAT practice", async () => {
    const appServices = services();
    await appServices.assessmentProfileStore?.save({
      schemaVersion: 1,
      guestSpaceId: FIXED_GUEST_SPACE.id,
      examId: "ucat",
      entryCycle: "2027",
      curriculumId: "a-level",
      learningStage: "year-12",
      subjectAreas: ["mathematics"],
      experience: "sampled",
      weeklyTime: "2-4",
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
    });
    const router = createAppRouter(["/practice/lnat-section-a-starter-v1"], appServices);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "请先填写 LNAT 背景信息" })).toBeInTheDocument();
  });

  it("requires an LNAT profile before opening the independent preparation page", async () => {
    const router = createAppRouter(["/exams/lnat/preparation"], services());
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "请先填写 LNAT 背景信息" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /填写 LNAT 背景信息/u })).toHaveAttribute(
      "href",
      "/exams/lnat/profile",
    );
  });
});
