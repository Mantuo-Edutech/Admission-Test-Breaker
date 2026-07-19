import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type { AccountAccessService } from "../../src/features/account/domain.js";
import type { DataRightsService } from "../../src/features/data-rights/domain.js";
import type { InviteOperationsService } from "../../src/features/invite-operations/domain.js";
import type { ProductFunnelAnalyticsService } from "../../src/features/product-funnel/analytics-domain.js";
import type { CollaborationService } from "../../src/features/collaboration/domain.js";
import type { ContentReviewOperationsService } from "../../src/features/content-review-operations/domain.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

function accountService(overrides: Partial<AccountAccessService> = {}): AccountAccessService {
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
    getAccessState: vi.fn(async () => ({ session: { email: "student@example.com" }, packageIds: ["tmua-full-access"] })),
    ...overrides,
  };
}

function services(
  accountAccess: AccountAccessService,
  dataRights?: DataRightsService,
  inviteOperations?: InviteOperationsService,
  productFunnelAnalytics?: ProductFunnelAnalyticsService,
  collaboration?: CollaborationService,
  contentReviewOperations?: ContentReviewOperationsService,
): AppServices {
  return {
    store: { async loadCurrent() { return { session: null, issue: null }; }, async save() { return { persisted: true }; }, async clearCurrent() {} },
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-18T00:00:00.000Z"),
    ids: { sessionId: () => "ses_account", eventId: () => "evt_account" },
    accountAccess,
    ...(dataRights === undefined ? {} : { dataRights }),
    ...(inviteOperations === undefined ? {} : { inviteOperations }),
    ...(productFunnelAnalytics === undefined ? {} : { productFunnelAnalytics }),
    ...(collaboration === undefined ? {} : { collaboration }),
    ...(contentReviewOperations === undefined ? {} : { contentReviewOperations }),
  };
}

function dataRightsService(): DataRightsService {
  return {
    configured: true,
    exportMyLearningData: vi.fn(async () => ({
      schemaVersion: 1 as const,
      exportedAt: "2026-07-18T08:00:00.000Z",
      account: {
        email: "student@example.com",
        platformUserId: "usr_student",
        learnerSpaceId: "lsp_student",
      },
      preparationProfile: null,
      practiceSessions: [],
      contentEntitlements: [],
    })),
    deleteMyAccount: vi.fn(async () => undefined),
  };
}

describe("student account lifecycle", () => {
  it("shows the signed-in learner and their content entitlement", async () => {
    const router = createAppRouter(["/account"], services(accountService(), dataRightsService()));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "账号与内容权限" })).toBeInTheDocument();
    expect(screen.getByText("student@example.com")).toBeInTheDocument();
    expect(screen.getByText("TMUA 六周精确训练计划")).toBeInTheDocument();
    expect(screen.getByText("TMUA Early Specimen Paper 1 逐题深度解析")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开已解锁资料" })).toHaveAttribute(
      "href",
      "/exams/tmua/notes/six-week-plan",
    );
    expect(screen.getByRole("link", { name: "完成试卷并打开解析" })).toHaveAttribute(
      "href",
      "/practice/tmua-specimen-p1",
    );
    expect(screen.getByRole("button", { name: /退出登录/u })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 JSON 副本" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "阅读学生隐私说明" })).toHaveAttribute("href", "/privacy");
  });

  it("shows catalog-resolved invite products as unlocked in the shared learning library", async () => {
    const router = createAppRouter(
      ["/library?exam=tmua"],
      services(accountService(), dataRightsService()),
    );
    render(<RouterProvider router={router} />);

    const library = await screen.findByRole("region", { name: "可用题库与学习资料" });
    expect(within(library).getAllByText("已解锁")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "账号权限已确认" })).toBeInTheDocument();
  });

  it("reveals the private operations entry only after the separate operator check passes", async () => {
    const inviteOperations: InviteOperationsService = {
      configured: true,
      getContext: vi.fn(async () => ({ active: true, displayName: "冰冰", permissions: ["issue_invite"] })),
      listPackages: vi.fn(async () => []),
      issueInvite: vi.fn(async () => ({
        id: "11111111-1111-4111-8111-111111111111",
        code: "A".repeat(36),
        expiresAt: "2026-07-25T00:00:00.000Z",
      })),
      listMine: vi.fn(async () => []),
      revokeMine: vi.fn(async () => undefined),
      listActivity: vi.fn(async () => []),
    };
    const router = createAppRouter(
      ["/account"],
      services(accountService(), dataRightsService(), inviteOperations),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("link", { name: /邀请码运营/u })).toHaveAttribute(
      "href",
      "/operations/invites",
    );
    expect(inviteOperations.getContext).toHaveBeenCalledOnce();
  });

  it("reveals the aggregate conversion dashboard only after its independent viewer check passes", async () => {
    const productFunnelAnalytics: ProductFunnelAnalyticsService = {
      configured: true,
      getContext: vi.fn(async () => ({
        active: true,
        displayName: "满托创始人",
        permissions: ["view_aggregate_product_funnel"],
      })),
      loadStageSummary: vi.fn(async () => []),
    };
    const router = createAppRouter(
      ["/account"],
      services(accountService(), dataRightsService(), undefined, productFunnelAnalytics),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("link", { name: /转化看板/u })).toHaveAttribute(
      "href",
      "/operations/funnel",
    );
    expect(productFunnelAnalytics.getContext).toHaveBeenCalledOnce();
  });

  it("gives a signed-in student separate authorization and collaborator-space entries", async () => {
    const collaboration = {
      configured: true,
    } as CollaborationService;
    const router = createAppRouter(
      ["/account"],
      services(accountService(), dataRightsService(), undefined, undefined, collaboration),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("link", { name: /管理数据授权/u })).toHaveAttribute(
      "href",
      "/account/sharing",
    );
    expect(screen.getByRole("link", { name: /老师／家长协作空间/u })).toHaveAttribute(
      "href",
      "/collaboration",
    );
  });

  it("reveals the content review workbench only after its independent capability check passes", async () => {
    const contentReviewOperations: ContentReviewOperationsService = {
      configured: true,
      getContext: vi.fn(async () => ({
        active: true,
        displayName: "满托教研负责人",
        permissions: ["view_content_review_queue", "prepare_review_packet"],
      })),
      loadSummary: vi.fn(async () => ({
        catalogRevision: "2026-07-19.33",
        pendingReviewItems: 68,
        affectedPublicProducts: 40,
        academicContentItems: 25,
        studentCalibrationItems: 12,
        deviceAccessibilityItems: 31,
      })),
      listQueue: vi.fn(async () => []),
    };
    const router = createAppRouter(
      ["/account"],
      services(
        accountService(),
        dataRightsService(),
        undefined,
        undefined,
        undefined,
        contentReviewOperations,
      ),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("link", { name: /内容审核台/u })).toHaveAttribute(
      "href",
      "/operations/content-review",
    );
    expect(contentReviewOperations.getContext).toHaveBeenCalledOnce();
  });

  it("requires password and exact confirmation before deleting the account", async () => {
    const user = userEvent.setup();
    const dataRights = dataRightsService();
    const router = createAppRouter(
      ["/account"],
      services(accountService(), dataRights),
    );
    render(<RouterProvider router={router} />);

    await user.click(await screen.findByRole("button", { name: /删除账号与学习数据/u }));
    await user.type(screen.getByLabelText("当前密码"), "SecurePass1");
    await user.type(screen.getByLabelText("确认文字"), "删除我的账号");
    await user.click(screen.getByRole("button", { name: "确认永久删除" }));

    expect(dataRights.deleteMyAccount).toHaveBeenCalledWith("SecurePass1");
    expect(await screen.findByRole("heading", { name: /你的数据属于你/u })).toBeInTheDocument();
    expect(screen.getByText(/账号和当前数据库中的学习记录已经删除/u)).toBeInTheDocument();
  });

  it("publishes a student-readable bilingual privacy page", async () => {
    const router = createAppRouter(["/privacy"], services(accountService()));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /你的数据属于你/u })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "默认只有学生本人可见" })).toBeInTheDocument();
    expect(screen.getByText(/当前页面不是最终法律隐私声明/u)).toBeInTheDocument();
  });

  it("requests a reset without revealing whether the email exists", async () => {
    const user = userEvent.setup();
    const account = accountService();
    const router = createAppRouter(["/forgot-password"], services(account));
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByLabelText("邮箱"), "student@example.com");
    await user.click(screen.getByRole("button", { name: "发送重置邮件" }));

    expect(account.requestPasswordReset).toHaveBeenCalledWith(
      "student@example.com",
      undefined,
    );
    expect(await screen.findByRole("heading", { name: "检查你的邮箱" })).toBeInTheDocument();
    expect(screen.getByText(/不会确认邮箱是否存在/u)).toBeInTheDocument();
  });

  it("verifies a recovery code before accepting and saving a new password", async () => {
    const user = userEvent.setup();
    const account = accountService();
    const router = createAppRouter(["/auth/reset?code=recovery-code"], services(account));
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "设置新密码" });
    await user.type(screen.getByLabelText("新密码"), "NewSecure1");
    await user.type(screen.getByLabelText("再次输入新密码"), "NewSecure1");
    await user.click(screen.getByRole("button", { name: "保存新密码" }));

    expect(account.completePasswordRecovery).toHaveBeenCalledWith("recovery-code");
    expect(account.updatePassword).toHaveBeenCalledWith("NewSecure1");
    expect(router.state.location.pathname).toBe("/account");
  });
});
