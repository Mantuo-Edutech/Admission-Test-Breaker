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
      sessionId: () => "ses_ucat-notes-test",
      eventId: () => "evt_ucat-notes-test",
    },
  };
}

async function saveUcatProfile(appServices: AppServices) {
  await appServices.assessmentProfileStore?.save({
    schemaVersion: 1,
    guestSpaceId: FIXED_GUEST_SPACE.id,
    examId: "ucat",
    entryCycle: "2027",
    curriculumId: "ib",
    learningStage: "year-12",
    subjectAreas: ["mathematics", "english-language", "biology", "chemistry"],
    experience: "sampled",
    weeklyTime: "5-7",
    createdAt: "2026-07-19T12:00:00.000Z",
    updatedAt: "2026-07-19T12:00:00.000Z",
  });
}

describe("UCAT review notes page", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("requires the student's UCAT profile before showing notes", async () => {
    render(<RouterProvider router={createAppRouter(["/exams/ucat/notes/foundations"], services())} />);

    expect(await screen.findByRole("heading", { level: 1, name: "请先填写 UCAT 背景信息" })).toBeInTheDocument();
  });

  it("renders all five modules, 25 units and original teaching after the profile", async () => {
    const appServices = services();
    await saveUcatProfile(appServices);
    const { container } = render(
      <RouterProvider router={createAppRouter(["/exams/ucat/notes/foundations"], appServices)} />,
    );

    expect(await screen.findByText("UCAT Four-Subtest and High-Speed Pacing Starting Review Notes", {
      selector: "h1 span",
    })).toBeInTheDocument();
    expect(container.querySelectorAll(".review-notes-module")).toHaveLength(5);
    expect(container.querySelectorAll(".review-notes-units li")).toHaveLength(25);
    expect(container.querySelectorAll(".review-notes-example")).toHaveLength(5);
    expect(container.querySelectorAll(".review-notes-recall details")).toHaveLength(15);
    expect(screen.getByRole("link", { name: "查看我的起点定位" })).toHaveAttribute(
      "href",
      "/exams/ucat/preparation",
    );
    expect(screen.getByRole("link", { name: "进入 UCAT 在线练习" })).toHaveAttribute(
      "href",
      "/exams/ucat/past-papers",
    );
    expect(screen.getByRole("link", { name: "下载 A4 PDF" })).toHaveAttribute(
      "href",
      "/notes/ucat/ucat-four-subtest-foundations-v1.pdf",
    );
    expect(screen.queryByText(/保证提分|录取概率为/u)).not.toBeInTheDocument();
  });
});
