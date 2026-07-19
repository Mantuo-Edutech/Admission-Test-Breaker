import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type { AccountAccessService } from "../../src/features/account/domain.js";
import type { InviteOperationsService, ManagedInvite } from "../../src/features/invite-operations/domain.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

const NOW = new Date("2026-07-19T00:00:00.000Z");

function account(authenticated: boolean): AccountAccessService {
  return {
    configured: true,
    botProtection: { provider: "turnstile", required: false, siteKey: null },
    previewInvite: vi.fn(async () => ({ valid: false, label: null, packages: [] })),
    register: vi.fn(async () => ({ status: "confirmation-required" as const, email: "operator@example.com" })),
    signIn: vi.fn(async () => ({ email: "operator@example.com" })),
    completeEmailConfirmation: vi.fn(async () => ({ email: "operator@example.com" })),
    requestPasswordReset: vi.fn(async () => undefined),
    completePasswordRecovery: vi.fn(async () => ({ email: "operator@example.com" })),
    updatePassword: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    redeemInvite: vi.fn(async () => ({ packageIds: [] })),
    getAccessState: vi.fn(async () => ({ session: authenticated ? { email: "operator@example.com" } : null, packageIds: [] })),
  };
}

function managedInvite(): ManagedInvite {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    reference: "TMUA 暑期咨询 01",
    status: "active",
    packageIds: ["tmua-full-access"],
    maxRedemptions: 1,
    redemptionCount: 0,
    createdAt: "2026-07-19T00:00:00.000Z",
    expiresAt: "2026-07-26T00:00:00.000Z",
    entitlementDuration: "30 days",
    revokedAt: null,
    revokeReason: null,
  };
}

function inviteOperations(active = true, initialInvites: readonly ManagedInvite[] = []): InviteOperationsService {
  return {
    configured: true,
    getContext: vi.fn(async () => ({ active, displayName: active ? "冰冰" : null, permissions: active ? ["issue_invite"] : [] })),
    listPackages: vi.fn(async () => [{ id: "tmua-full-access", name: "TMUA 完整资料", description: "六周计划与逐题解析", publishedResourceCount: 2, publishedResourceTitles: ["六周精确训练计划", "Early Specimen Paper 1 逐题深度解析"] }]),
    issueInvite: vi.fn(async () => ({ id: "22222222-2222-4222-8222-222222222222", code: "ABCDEF0123456789ABCDEF0123456789ABCD", expiresAt: "2026-07-26T00:00:00.000Z" })),
    listMine: vi.fn(async () => initialInvites),
    revokeMine: vi.fn(async () => undefined),
    listActivity: vi.fn(async () => [{ eventType: "operator_granted" as const, inviteId: null, occurredAt: "2026-07-19T00:00:00.000Z" }]),
  };
}

function services(authenticated: boolean, operations: InviteOperationsService): AppServices {
  return {
    store: { async loadCurrent() { return { session: null, issue: null }; }, async save() { return { persisted: true }; }, async clearCurrent() {} },
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => NOW,
    ids: { sessionId: () => "ses_operations", eventId: () => "evt_operations" },
    accountAccess: account(authenticated),
    inviteOperations: operations,
  };
}

describe("invite operations page", () => {
  it("requires sign-in before checking the private operator capability", async () => {
    const operations = inviteOperations();
    const router = createAppRouter(["/operations/invites"], services(false, operations));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "请先登录运营账号" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "登录并继续" })).toHaveAttribute("href", "/login");
    expect(operations.getContext).not.toHaveBeenCalled();
  });

  it("fails closed for a normal signed-in student", async () => {
    const operations = inviteOperations(false);
    const router = createAppRouter(["/operations/invites"], services(true, operations));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "当前账号没有运营权限" })).toBeInTheDocument();
    expect(screen.getByText(/不会展示学生学习数据/u)).toBeInTheDocument();
    expect(operations.listPackages).not.toHaveBeenCalled();
  });

  it("issues a finite code for a published package and reveals plaintext once", async () => {
    const user = userEvent.setup();
    const operations = inviteOperations();
    const router = createAppRouter(["/operations/invites"], services(true, operations));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /签发邀请码/u })).toBeInTheDocument();
    expect(screen.getByText("TMUA 完整资料")).toBeInTheDocument();
    await user.type(screen.getByLabelText("内部参考"), "TMUA 暑期咨询 01");
    await user.click(screen.getByRole("button", { name: "签发邀请码" }));

    expect(operations.issueInvite).toHaveBeenCalledWith({
      reference: "TMUA 暑期咨询 01",
      packageIds: ["tmua-full-access"],
      maxRedemptions: 1,
      expiresAt: "2026-07-26T00:00:00.000Z",
      entitlementDays: 30,
    });
    expect(await screen.findByRole("heading", { name: "邀请码已经签发" })).toBeInTheDocument();
    expect(screen.getByText("ABCDEF0123456789ABCDEF0123456789ABCD")).toBeInTheDocument();
    expect(screen.getByText(/只显示这一次/u)).toBeInTheDocument();
  });

  it("lists only the operator records and requires a reason before revocation", async () => {
    const user = userEvent.setup();
    const operations = inviteOperations(true, [managedInvite()]);
    const router = createAppRouter(["/operations/invites"], services(true, operations));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "邀请码使用状态" })).toBeInTheDocument();
    expect(screen.getByText("TMUA 暑期咨询 01")).toBeInTheDocument();
    expect(screen.getByText("可使用")).toBeInTheDocument();
    expect(screen.getByText(/只显示次数，不显示学生身份/u)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "撤销" }));
    await user.type(screen.getByLabelText("撤销原因"), "咨询已经结束");
    await user.click(screen.getByRole("button", { name: "确认撤销" }));

    await waitFor(() => expect(operations.revokeMine).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "咨询已经结束",
    ));
  });
});
