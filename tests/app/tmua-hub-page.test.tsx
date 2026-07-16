import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import { createPreparationProfile } from "../../src/features/preparation-profile/domain.js";
import type { PreparationProfile } from "../../src/features/preparation-profile/domain.js";
import type {
  PreparationProfileLoadResult,
  PreparationProfileStore,
} from "../../src/features/preparation-profile/storage/store.js";
import { createPracticeSession } from "../../src/features/practice/domain/session.js";
import type { PracticeSession } from "../../src/features/practice/domain/session.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../../src/features/practice/storage/store.js";
import type { GuestSpaceId } from "../../src/platform/shared/ids.js";
import {
  FIXED_GUEST_SPACE,
  FIXED_GUEST_SPACE_STORE,
} from "../support/fixed-guest-space-store.js";
import { EMPTY_PREPARATION_PROFILE_STORE } from "../support/empty-preparation-profile-store.js";

class JourneySessionStore implements PracticeSessionStore {
  saved: PracticeSession | null = null;

  constructor(
    private readonly loaded: SessionLoadResult = { session: null, issue: null },
    private readonly saveResult: SessionSaveResult = { persisted: true },
  ) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    return this.saved === null ? this.loaded : { session: this.saved, issue: null };
  }

  async save(session: PracticeSession): Promise<SessionSaveResult> {
    this.saved = session;
    return this.saveResult;
  }

  async clearCurrent(): Promise<void> {
    this.saved = null;
  }
}

class JourneyProfileStore implements PreparationProfileStore {
  saved: PreparationProfile | null;

  constructor(profile: PreparationProfile | null = null) {
    this.saved = profile;
  }

  async load(_guestSpaceId: GuestSpaceId): Promise<PreparationProfileLoadResult> {
    return { profile: this.saved, issue: null };
  }

  async save(profile: PreparationProfile): Promise<{ persisted: boolean }> {
    this.saved = profile;
    return { persisted: true };
  }

  async clear(_guestSpaceId: GuestSpaceId): Promise<void> {
    this.saved = null;
  }
}

function profile(): PreparationProfile {
  return createPreparationProfile({
    guestSpaceId: FIXED_GUEST_SPACE.id,
    exam: "TMUA",
    entryCycle: "2027",
    curriculumSystem: "caie",
    selections: [
      { qualificationId: "caie-9709-2026-2027", unitIds: ["p1"] },
    ],
    experience: "sampled",
    createdAt: "2026-07-13T09:00:00.000Z",
    updatedAt: "2026-07-13T09:00:00.000Z",
  });
}

function services(
  store: PracticeSessionStore = new JourneySessionStore(),
  profileStore: PreparationProfileStore = EMPTY_PREPARATION_PROFILE_STORE,
): AppServices {
  return {
    store,
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore,
    now: () => new Date("2026-07-13T09:00:00.000Z"),
    ids: {
      sessionId: () => "ses_tmua-journey-test",
      eventId: () => "evt_tmua-journey-test",
    },
  };
}

function activeSession(): PracticeSession {
  return {
    ...createPracticeSession({
      id: "ses_resume-test",
      learningSpaceId: FIXED_GUEST_SPACE.id,
      actor: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
      startedAt: "2026-07-13T08:30:00.000Z",
      eventId: "evt_resume-started",
    }),
    answers: { "tmua-2023-p1-q01": "F" },
  };
}

describe("TMUA staged preparation journey", () => {
  it("keeps the public overview separate from personalised modules", async () => {
    const router = createAppRouter(["/exams/tmua"], services());
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /先了解起点.*再开始练习/u }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /填写课程信息/u })).toHaveAttribute(
      "href",
      "/exams/tmua/profile",
    );
    expect(screen.getByRole("heading", { name: "四步完成 TMUA 准备" })).toBeInTheDocument();
    expect(screen.getByText(/不收集姓名、电话或微信/u)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "开始完整练习" })).not.toBeInTheDocument();
  });

  it("saves a preparation profile then advances to the coverage page", async () => {
    const user = userEvent.setup();
    const profileStore = new JourneyProfileStore();
    const router = createAppRouter(
      ["/exams/tmua/profile"],
      services(new JourneySessionStore(), profileStore),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "告诉我们你正在学什么" });
    await user.click(screen.getByRole("radio", { name: /CAIE/u }));
    await user.click(screen.getByRole("checkbox", { name: /Mathematics \(9709\)/u }));
    const modules = screen.getByLabelText(/Mathematics \(9709\) 模块/u);
    await user.click(within(modules).getByRole("checkbox", { name: /Pure Mathematics 1/u }));
    await user.click(screen.getByRole("radio", { name: /做过少量题/u }));
    await user.click(screen.getByRole("button", { name: "保存并查看知识覆盖" }));

    expect(profileStore.saved).toMatchObject({
      curriculumSystem: "caie",
      selections: [{ qualificationId: "caie-9709-2026-2027", unitIds: ["p1"] }],
    });
    expect(router.state.location.pathname).toBe("/exams/tmua/coverage");
    expect(
      await screen.findByRole("heading", {
        name: /课程覆盖与补学建议.*Course Coverage & Learning Plan/u,
      }),
    ).toBeInTheDocument();
  });

  it("requires a preparation profile before showing module choices", async () => {
    const router = createAppRouter(["/exams/tmua/dashboard"], services());
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "请先填写课程信息" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "30 分钟能力诊断" })).not.toBeInTheDocument();
  });

  it("also protects direct practice entry until a preparation profile exists", async () => {
    const router = createAppRouter(
      ["/practice/tmua-2023-paper-1"],
      services(new JourneySessionStore({ session: activeSession(), issue: null })),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "请先填写课程信息" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "第 1 题" })).not.toBeInTheDocument();
  });

  it("shows deterministic course coverage without turning it into ability", async () => {
    const router = createAppRouter(
      ["/exams/tmua/coverage"],
      services(new JourneySessionStore(), new JourneyProfileStore(profile())),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByLabelText("7 of 10 topics covered")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /7 项知识已经覆盖.*7 areas are covered/u,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /课程覆盖不等于掌握程度.*Coverage is not mastery/u,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /代数与函数.*Algebra & Functions/u }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", {
        name: "知识点已覆盖：只需要复习；现阶段不需要额外课程",
      }),
    ).toHaveLength(7);
    expect(screen.getByText(/若全部未学，基础学习约 9–14 小时/u)).toBeInTheDocument();
    expect(screen.getByText(/生成方式：固定课程映射，不调用 AI/u)).toBeInTheDocument();
    expect(screen.getAllByText("课程档案未显示覆盖")).toHaveLength(3);
  });

  it("presents separate module destinations and starts a Guest-owned paper", async () => {
    const user = userEvent.setup();
    const store = new JourneySessionStore();
    const router = createAppRouter(
      ["/exams/tmua/dashboard"],
      services(store, new JourneyProfileStore(profile())),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "下一步：完成一套在线真题" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /诊断/u })).not.toBeInTheDocument();
    expect(screen.getByText(/原创固定题正在独立审核/u)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /课程覆盖与补学建议.*Course Coverage Plan/u,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看学习建议" })).toHaveAttribute(
      "href",
      "/exams/tmua/coverage",
    );
    expect(screen.getByRole("link", { name: "查看历年真题" })).toHaveAttribute(
      "href",
      "/exams/tmua/past-papers",
    );
    expect(screen.getByRole("link", { name: "查看模考与资料" })).toHaveAttribute(
      "href",
      "/exams/tmua/resources",
    );

    await user.click(screen.getByRole("button", { name: "开始完整练习" }));
    expect(store.saved).toMatchObject({
      learningSpaceId: FIXED_GUEST_SPACE.id,
      startedBy: { kind: "guest", actorId: FIXED_GUEST_SPACE.ownerActorId },
    });
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-p1");
  });

  it("resumes a Guest-owned active paper from the dashboard", async () => {
    const user = userEvent.setup();
    const store = new JourneySessionStore({ session: activeSession(), issue: null });
    const router = createAppRouter(
      ["/exams/tmua/dashboard"],
      services(store, new JourneyProfileStore(profile())),
    );
    render(<RouterProvider router={router} />);

    await user.click(await screen.findByRole("button", { name: "继续练习 · 1 / 20" }));
    expect(router.state.location.pathname).toBe("/practice/tmua-2023-p1");
  });

  it("keeps the 30-minute diagnostic honest while its original form is reviewed", async () => {
    const router = createAppRouter(
      ["/exams/tmua/diagnostic"],
      services(new JourneySessionStore(), new JourneyProfileStore(profile())),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText("30 分钟")).toBeInTheDocument();
    expect(screen.getByText("8 道固定题")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "诊断卷正在独立审核" })).toBeInTheDocument();
    expect(screen.getByText(/现有历年真题不会被拆分使用/u)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /开始诊断/u })).not.toBeInTheDocument();
  });

  it("shows every imported paper publicly and distinguishes online availability", async () => {
    const router = createAppRouter(
      ["/exams/tmua/past-papers"],
      services(new JourneySessionStore(), EMPTY_PREPARATION_PROFILE_STORE),
    );
    render(<RouterProvider router={router} />);

    const table = await screen.findByRole("table", { name: "TMUA 历年真题资料馆" });
    expect(within(table).getAllByRole("row")).toHaveLength(19);
    expect(within(table).getAllByText("已收录")).toHaveLength(18);
    expect(within(table).getAllByText("原卷 + 在线答题卡")).toHaveLength(17);
    expect(within(table).getByText("逐题在线")).toBeInTheDocument();
    expect(within(table).getAllByRole("link", { name: "开始练习" })).toHaveLength(18);
    expect(screen.getAllByText("18 / 18")).toHaveLength(2);
    expect(screen.getByText("360 / 360")).toBeInTheDocument();
    expect(screen.queryByText("建设中")).not.toBeInTheDocument();
  });

  it("opens Bingbing's QR only from the separate resources page", async () => {
    const user = userEvent.setup();
    const router = createAppRouter(
      ["/exams/tmua/resources"],
      services(new JourneySessionStore(), new JourneyProfileStore(profile())),
    );
    render(<RouterProvider router={router} />);

    await user.click(await screen.findByRole("button", { name: "添加冰冰，获取模考" }));
    const dialog = screen.getByRole("dialog", { name: "添加冰冰，获取完整模考" });
    expect(within(dialog).getByRole("img", { name: "冰冰老师微信二维码" })).toHaveAttribute(
      "src",
      "/brand/bingbing-wechat-qr.jpg",
    );
    expect(within(dialog).getByText(/不会向冰冰开放你的课程信息/u)).toBeInTheDocument();
  });
});
