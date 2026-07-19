import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type { AccountAccessService } from "../../src/features/account/domain.js";
import type {
  CollaborationArtifact,
  CollaborationService,
  SharedLearnerAccess,
} from "../../src/features/collaboration/domain.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

const access: SharedLearnerAccess = {
  grantId: "grant_teacher_01",
  learnerReference: "learner_reference_ABC123",
  subjectKind: "teacher",
  scopes: ["progress:read", "plans:write"],
  examIds: ["tmua"],
  expiresAt: "2026-08-18T00:00:00.000Z",
};

const plan: CollaborationArtifact = {
  id: "artifact_plan_01",
  grantId: access.grantId,
  kind: "plan",
  examId: "tmua",
  title: "第一周函数复习",
  body: "先完成代数与函数复习，再做一次诊断。",
  dueAt: null,
  authorReference: "teacher_reference_456789",
  createdAt: "2026-07-19T09:00:00.000Z",
};

function accountService(signedIn = true): AccountAccessService {
  return {
    configured: true,
    botProtection: { provider: "turnstile", required: false, siteKey: null },
    previewInvite: vi.fn(async () => ({ valid: false, label: null, packages: [] })),
    register: vi.fn(async () => ({ status: "confirmation-required" as const, email: "student@example.com" })),
    signIn: vi.fn(async () => ({ email: "student@example.com" })),
    completeEmailConfirmation: vi.fn(async () => ({ email: "student@example.com" })),
    requestPasswordReset: vi.fn(async () => undefined),
    completePasswordRecovery: vi.fn(async () => ({ email: "student@example.com" })),
    updatePassword: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    redeemInvite: vi.fn(async () => ({ packageIds: [] })),
    getAccessState: vi.fn(async () => ({
      session: signedIn ? { email: "student@example.com" } : null,
      packageIds: [],
    })),
  };
}

function collaborationService(overrides: Partial<CollaborationService> = {}): CollaborationService {
  return {
    configured: true,
    issueInvite: vi.fn(async () => ({
      id: "invite_01",
      code: "MTSHARE-1234567890-ABCDEFGHIJ",
      inviteExpiresAt: "2026-07-26T00:00:00.000Z",
    })),
    listMyInvites: vi.fn(async () => []),
    cancelMyInvite: vi.fn(async () => undefined),
    listMyGrants: vi.fn(async () => []),
    revokeMyGrant: vi.fn(async () => undefined),
    listMyAudit: vi.fn(async () => []),
    redeemInvite: vi.fn(async () => access),
    listSharedLearners: vi.fn(async () => [access]),
    getSharedProgress: vi.fn(async () => ({
      grantId: access.grantId,
      examId: "tmua" as const,
      sessions: [{
        sessionId: "session_01",
        paperId: "tmua-diagnostic-v1",
        status: "submitted" as const,
        startedAt: "2026-07-19T08:00:00.000Z",
        submittedAt: "2026-07-19T08:20:00.000Z",
        answeredCount: 12,
        activeMs: 1_200_000,
        answerChanges: 3,
        lastActivityAt: "2026-07-19T08:20:00.000Z",
      }],
    })),
    listSharedResponses: vi.fn(async () => []),
    listArtifacts: vi.fn(async () => []),
    createArtifact: vi.fn(async () => plan),
    ...overrides,
  };
}

function services(
  collaboration: CollaborationService,
  signedIn = true,
): AppServices {
  return {
    store: {
      async loadCurrent() { return { session: null, issue: null }; },
      async save() { return { persisted: true }; },
      async clearCurrent() {},
    },
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-19T00:00:00.000Z"),
    ids: { sessionId: () => "ses_collaboration_test", eventId: () => "evt_collaboration_test" },
    accountAccess: accountService(signedIn),
    collaboration,
  };
}

describe("student-controlled collaboration pages", () => {
  it("keeps every learning-data permission behind student login", async () => {
    const router = createAppRouter(["/account/sharing"], services(collaborationService(), false));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "登录后管理学习数据授权" })).toBeInTheDocument();
    expect(screen.getByText(/每项权限都必须由你本人选择/u)).toBeInTheDocument();
  });

  it("issues a one-time parent code with independently selected scopes", async () => {
    const user = userEvent.setup();
    const collaboration = collaborationService();
    const router = createAppRouter(["/account/sharing"], services(collaboration));
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "由你决定谁能看到什么" });
    await user.click(screen.getByRole("button", { name: /家长 · Parent/u }));
    await user.click(screen.getByRole("checkbox", { name: /查看具体作答/u }));
    await user.click(screen.getByRole("button", { name: "生成一次性协作码" }));

    expect(collaboration.issueInvite).toHaveBeenCalledWith({
      subjectKind: "parent",
      scopes: ["progress:read", "responses:read"],
      examIds: ["tmua"],
      grantDays: 30,
    });
    expect(await screen.findByText("MTSHARE-1234567890-ABCDEFGHIJ")).toBeInTheDocument();
    expect(screen.getByText("只显示这一次")).toBeInTheDocument();
  });

  it("binds a collaboration code to the signed-in recipient account", async () => {
    const user = userEvent.setup();
    const collaboration = collaborationService();
    const router = createAppRouter(["/collaboration/redeem"], services(collaboration));
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByLabelText("协作码"), "MTSHARE-1234567890-ABCDEFGHIJ");
    await user.click(screen.getByRole("button", { name: "核验并接受授权" }));

    expect(collaboration.redeemInvite).toHaveBeenCalledWith("MTSHARE-1234567890-ABCDEFGHIJ");
    expect(await screen.findByRole("heading", { name: "协作授权已经生效" })).toBeInTheDocument();
    expect(screen.getByText("老师 · Teacher")).toBeInTheDocument();
  });

  it("shows progress, keeps exact answers private and permits only the authorised write action", async () => {
    const user = userEvent.setup();
    const collaboration = collaborationService();
    const router = createAppRouter(
      [`/collaboration/${access.grantId}?exam=tmua`],
      services(collaboration),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "TMUA 已保存记录" })).toBeInTheDocument();
    expect(screen.getByText("12 题")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "具体作答保持私密" })).toBeInTheDocument();
    expect(collaboration.listSharedResponses).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("标题"), "第一周函数复习");
    await user.type(screen.getByLabelText("具体内容"), "先完成代数与函数复习，再做一次诊断。");
    await user.click(screen.getByRole("button", { name: "制定计划" }));

    expect(collaboration.createArtifact).toHaveBeenCalledWith({
      grantId: access.grantId,
      kind: "plan",
      examId: "tmua",
      title: "第一周函数复习",
      body: "先完成代数与函数复习，再做一次诊断。",
    });
    expect(await screen.findByText("第一周函数复习")).toBeInTheDocument();
  });

  it("fails closed when a grant no longer appears in the active shared-space list", async () => {
    const collaboration = collaborationService({ listSharedLearners: vi.fn(async () => []) });
    const router = createAppRouter(["/collaboration/revoked-grant?exam=tmua"], services(collaboration));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "当前没有可用授权" })).toBeInTheDocument();
    expect(collaboration.getSharedProgress).not.toHaveBeenCalled();
    expect(collaboration.listSharedResponses).not.toHaveBeenCalled();
  });
});
