import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type { AccountAccessService } from "../../src/features/account/domain.js";
import type { PendingInviteStore } from "../../src/features/account/storage/pending-invite.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

class MemoryPendingInviteStore implements PendingInviteStore {
  constructor(private code: string | null = null) {}
  load() { return this.code; }
  save(code: string) { this.code = code; }
  clear() { this.code = null; }
}

function accountService(
  overrides: Partial<AccountAccessService> = {},
): AccountAccessService {
  return {
    configured: true,
    previewInvite: vi.fn(async () => ({
      valid: true,
      label: "TMUA 完整资料权限",
      packages: ["tmua-full-access"],
    })),
    register: vi.fn(async () => ({
      status: "signed-in" as const,
      session: { email: "student@example.com" },
    })),
    signIn: vi.fn(async () => ({ email: "student@example.com" })),
    completeEmailConfirmation: vi.fn(async () => ({ email: "student@example.com" })),
    redeemInvite: vi.fn(async () => ({ packageIds: ["tmua-full-access"] })),
    getAccessState: vi.fn(async () => ({
      session: { email: "student@example.com" },
      packageIds: ["tmua-full-access"],
    })),
    ...overrides,
  };
}

function services(
  account: AccountAccessService,
  pendingInvite: PendingInviteStore,
): AppServices {
  return {
    store: {
      async loadCurrent() { return { session: null, issue: null }; },
      async save() { return { persisted: true }; },
      async clearCurrent() {},
    },
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-15T00:00:00.000Z"),
    ids: {
      sessionId: () => "ses_account-flow",
      eventId: () => "evt_account-flow",
    },
    accountAccess: account,
    pendingInvite,
  };
}

describe("invite-first account access flow", () => {
  it("validates an invite before exposing registration", async () => {
    const user = userEvent.setup();
    const account = accountService();
    const pending = new MemoryPendingInviteStore();
    const router = createAppRouter(["/access"], services(account, pending));
    render(<RouterProvider router={router} />);

    await user.type(
      await screen.findByLabelText("邀请码"),
      "MANTUO-TMUA-LOCAL-2026-ACCESS",
    );
    await user.click(screen.getByRole("button", { name: "验证并继续注册" }));

    expect(account.previewInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(pending.load()).toBe("MANTUOTMUALOCAL2026ACCESS");
    expect(await screen.findByRole("heading", { name: "创建账号，保存完整训练记录" })).toBeInTheDocument();
  });

  it("does not create an account until the registration fields pass locally", async () => {
    const user = userEvent.setup();
    const account = accountService();
    const router = createAppRouter(
      ["/register"],
      services(account, new MemoryPendingInviteStore("MANTUOTMUALOCAL2026ACCESS")),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "创建账号，保存完整训练记录" });
    await user.click(screen.getByRole("button", { name: "创建账号并解锁" }));

    expect(screen.getByText("请输入有效的邮箱地址")).toBeInTheDocument();
    expect(account.register).not.toHaveBeenCalled();
  });

  it("redeems the pending invite immediately when registration returns a session", async () => {
    const user = userEvent.setup();
    const account = accountService();
    const pending = new MemoryPendingInviteStore("MANTUOTMUALOCAL2026ACCESS");
    const router = createAppRouter(["/register"], services(account, pending));
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByLabelText("邮箱"), "student@example.com");
    await user.type(screen.getByLabelText("密码"), "SecurePass1");
    await user.type(screen.getByLabelText("再次输入密码"), "SecurePass1");
    await user.click(screen.getByRole("button", { name: "创建账号并解锁" }));

    expect(account.redeemInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(pending.load()).toBeNull();
    expect(await screen.findByRole("heading", { name: "内容已解锁" })).toBeInTheDocument();
  });

  it("keeps the invite pending while verified email is required", async () => {
    const user = userEvent.setup();
    const account = accountService({
      register: vi.fn(async () => ({
        status: "confirmation-required" as const,
        email: "student@example.com",
      })),
    });
    const pending = new MemoryPendingInviteStore("MANTUOTMUALOCAL2026ACCESS");
    const router = createAppRouter(["/register"], services(account, pending));
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByLabelText("邮箱"), "student@example.com");
    await user.type(screen.getByLabelText("密码"), "SecurePass1");
    await user.type(screen.getByLabelText("再次输入密码"), "SecurePass1");
    await user.click(screen.getByRole("button", { name: "创建账号并解锁" }));

    expect(await screen.findByRole("heading", { name: "请确认你的邮箱" })).toBeInTheDocument();
    expect(account.redeemInvite).not.toHaveBeenCalled();
    expect(pending.load()).toBe("MANTUOTMUALOCAL2026ACCESS");
  });

  it("redeems a pending invite after an existing student logs in", async () => {
    const user = userEvent.setup();
    const account = accountService();
    const pending = new MemoryPendingInviteStore("MANTUOTMUALOCAL2026ACCESS");
    const router = createAppRouter(["/login"], services(account, pending));
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByLabelText("邮箱"), "student@example.com");
    await user.type(screen.getByLabelText("密码"), "SecurePass1");
    await user.click(screen.getByRole("button", { name: "登录" }));

    expect(account.signIn).toHaveBeenCalledWith("student@example.com", "SecurePass1");
    expect(account.redeemInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(await screen.findByRole("heading", { name: "内容已解锁" })).toBeInTheDocument();
  });

  it("does not claim success when the completion URL has no entitlement", async () => {
    const account = accountService({
      getAccessState: vi.fn(async () => ({ session: null, packageIds: [] })),
    });
    const router = createAppRouter(
      ["/access/complete"],
      services(account, new MemoryPendingInviteStore()),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "尚未找到有效权限" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("邀请码对应的模考与复习资料已经绑定到你的学生账号。")).not.toBeInTheDocument();
  });

  it("reflects a real entitlement on the resources page", async () => {
    const account = accountService();
    const router = createAppRouter(
      ["/exams/tmua/resources"],
      services(account, new MemoryPendingInviteStore()),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText("账号权限已确认")).toBeInTheDocument();
    expect(screen.getByText("已解锁")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "输入邀请码" })).not.toBeInTheDocument();
  });
});
