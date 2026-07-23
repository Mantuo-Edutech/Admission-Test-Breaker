import { render, screen } from "@testing-library/react";
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
    now: () => new Date("2026-07-19T12:00:00.000Z"),
    ids: {
      sessionId: () => "ses_lnat-notes-test",
      eventId: () => "evt_lnat-notes-test",
    },
  };
}

async function saveLnatProfile(appServices: AppServices) {
  await appServices.assessmentProfileStore?.save({
    schemaVersion: 1,
    guestSpaceId: FIXED_GUEST_SPACE.id,
    examId: "lnat",
    entryCycle: "2027",
    curriculumId: "a-level",
    learningStage: "year-12",
    subjectAreas: ["english-language", "humanities"],
    experience: "sampled",
    weeklyTime: "2-4",
    createdAt: "2026-07-19T12:00:00.000Z",
    updatedAt: "2026-07-19T12:00:00.000Z",
  });
}

describe("LNAT review notes page", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("requires the student's LNAT profile before showing notes", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/lnat/notes/foundations"], services())} />);

    expect(await screen.findByRole("heading", { level: 1, name: "请先填写 LNAT 背景信息" })).toBeInTheDocument();
  });

  it("renders all four modules, 21 units and original teaching after the profile", async () => {
    const appServices = services();
    await saveLnatProfile(appServices);
    const { container } = render(
      <RouterProvider router={createAppRouter(["/exams/lnat/notes/foundations"], appServices)} />,
    );

    expect(await screen.findByText("LNAT Argument Reading and Writing Starting Review Notes", {
      selector: "h1 span",
    })).toBeInTheDocument();
    expect(container.querySelectorAll(".review-notes-module")).toHaveLength(4);
    expect(container.querySelectorAll(".review-notes-units li")).toHaveLength(21);
    expect(container.querySelectorAll(".review-notes-example")).toHaveLength(4);
    expect(container.querySelectorAll(".review-notes-recall details")).toHaveLength(12);
    expect(screen.getByRole("link", { name: "查看我的起点定位" })).toHaveAttribute(
      "href",
      "/exams/lnat/preparation",
    );
    expect(screen.getByRole("link", { name: "进入 LNAT 在线练习" })).toHaveAttribute(
      "href",
      "/exams/lnat/past-papers",
    );
    expect(screen.getByRole("link", { name: "下载 A4 PDF" })).toHaveAttribute(
      "href",
      "/notes/lnat/lnat-reading-writing-foundations-v1.pdf",
    );
    expect(screen.queryByText(/录取概率|官方换算分|自动作文分/u)).not.toBeInTheDocument();
  });
});
