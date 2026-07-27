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
  constructor(
    private code: string | null = null,
    private returnTo: string | null = null,
  ) {}
  load() { return this.code; }
  save(code: string) { this.code = code; }
  loadReturnTo() { return this.returnTo; }
  saveReturnTo(path: string) { this.returnTo = path; }
  clear() { this.code = null; this.returnTo = null; }
}

function accountService(
  overrides: Partial<AccountAccessService> = {},
): AccountAccessService {
  return {
    configured: true,
    botProtection: { provider: "turnstile", required: false, siteKey: null },
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
    requestPasswordReset: vi.fn(async () => undefined),
    completePasswordRecovery: vi.fn(async () => ({ email: "student@example.com" })),
    updatePassword: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
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
    const account = accountService({
      getAccessState: vi.fn(async () => ({ session: null, packageIds: [] })),
    });
    const pending = new MemoryPendingInviteStore();
    const router = createAppRouter(["/access"], services(account, pending));
    render(<RouterProvider router={router} />);

    await user.type(
      await screen.findByLabelText("Invitation code"),
      "MANTUO-TMUA-LOCAL-2026-ACCESS",
    );
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));

    expect(account.previewInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(pending.load()).toBe("MANTUOTMUALOCAL2026ACCESS");
    expect(await screen.findByRole("heading", { name: /Create an account\. Keep your complete record/u })).toBeInTheDocument();
  });

  it("preserves a deep-review return target through invite validation and registration", async () => {
    const user = userEvent.setup();
    const account = accountService({
      getAccessState: vi.fn(async () => ({ session: null, packageIds: [] })),
    });
    const pending = new MemoryPendingInviteStore();
    const router = createAppRouter(
      ["/access?returnTo=%2Fresults%2Fses_original-result"],
      services(account, pending),
    );
    render(<RouterProvider router={router} />);

    await user.type(
      await screen.findByLabelText("Invitation code"),
      "MANTUO-TMUA-LOCAL-2026-ACCESS",
    );
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));
    expect(pending.loadReturnTo()).toBe("/results/ses_original-result");

    await user.type(await screen.findByLabelText("Email"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "SecurePass1");
    await user.type(screen.getByLabelText("Confirm password"), "SecurePass1");
    await user.click(screen.getByRole("button", { name: "Create account and unlock" }));

    expect(account.redeemInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(router.state.location.pathname).toBe("/results/ses_original-result");
    expect(pending.load()).toBeNull();
    expect(pending.loadReturnTo()).toBeNull();
  });

  it("does not create an account until the registration fields pass locally", async () => {
    const user = userEvent.setup();
    const account = accountService();
    const router = createAppRouter(
      ["/register"],
      services(account, new MemoryPendingInviteStore("MANTUOTMUALOCAL2026ACCESS")),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: /Create an account\. Keep your complete record/u });
    await user.click(screen.getByRole("button", { name: "Create account and unlock" }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(account.register).not.toHaveBeenCalled();
  });

  it("redeems the pending invite immediately when registration returns a session", async () => {
    const user = userEvent.setup();
    const account = accountService();
    const pending = new MemoryPendingInviteStore("MANTUOTMUALOCAL2026ACCESS");
    const appServices = services(account, pending);
    const track = vi.fn(async () => undefined);
    appServices.funnel = { track };
    const router = createAppRouter(["/register"], appServices);
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByLabelText("Email"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "SecurePass1");
    await user.type(screen.getByLabelText("Confirm password"), "SecurePass1");
    await user.click(screen.getByRole("button", { name: "Create account and unlock" }));

    expect(account.redeemInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(pending.load()).toBeNull();
    expect(await screen.findByRole("heading", { name: "Content unlocked" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith({
      eventType: "invite_redeemed",
      examId: "tmua",
      contextCode: "register",
    });
  });

  it("recognises a deep-review-only invite and opens the product registered for that package", async () => {
    const account = accountService({
      getAccessState: vi.fn(async () => ({
        session: { email: "student@example.com" },
        packageIds: ["tmua-deep-review"],
      })),
    });
    const router = createAppRouter(
      ["/access/complete"],
      services(account, new MemoryPendingInviteStore()),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Content unlocked" })).toBeInTheDocument();
    expect(screen.getByText(/1 published resource is/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete the paper and open the review" })).toHaveAttribute(
      "href",
      "/practice/tmua-specimen-p1",
    );
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

    await user.type(await screen.findByLabelText("Email"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "SecurePass1");
    await user.type(screen.getByLabelText("Confirm password"), "SecurePass1");
    await user.click(screen.getByRole("button", { name: "Create account and unlock" }));

    expect(await screen.findByRole("heading", { name: /Confirm your email/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open local confirmation inbox" })).toHaveAttribute(
      "href",
      "http://127.0.0.1:54324",
    );
    expect(account.redeemInvite).not.toHaveBeenCalled();
    expect(pending.load()).toBe("MANTUOTMUALOCAL2026ACCESS");
  });

  it("redeems a pending invite after an existing student logs in", async () => {
    const user = userEvent.setup();
    const account = accountService();
    const pending = new MemoryPendingInviteStore("MANTUOTMUALOCAL2026ACCESS");
    const router = createAppRouter(["/login"], services(account, pending));
    render(<RouterProvider router={router} />);

    await user.type(await screen.findByLabelText("Email"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "SecurePass1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(account.signIn).toHaveBeenCalledWith(
      "student@example.com",
      "SecurePass1",
      undefined,
    );
    expect(account.redeemInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(await screen.findByRole("heading", { name: "Content unlocked" })).toBeInTheDocument();
  });

  it("redeems directly when an already signed-in student enters another invite", async () => {
    const user = userEvent.setup();
    const account = accountService({
      getAccessState: vi.fn(async () => ({
        session: { email: "student@example.com" },
        packageIds: [],
      })),
    });
    const pending = new MemoryPendingInviteStore();
    const appServices = services(account, pending);
    const track = vi.fn(async () => undefined);
    appServices.funnel = { track };
    const router = createAppRouter(
      ["/access?returnTo=%2Fresults%2Fses_existing-student"],
      appServices,
    );
    render(<RouterProvider router={router} />);

    await user.type(
      await screen.findByLabelText("Invitation code"),
      "MANTUO-TMUA-LOCAL-2026-ACCESS",
    );
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));

    expect(account.previewInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(account.redeemInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(account.register).not.toHaveBeenCalled();
    expect(account.signIn).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe("/results/ses_existing-student");
    expect(pending.load()).toBeNull();
    expect(track).toHaveBeenCalledWith({
      eventType: "invite_redeemed",
      examId: "tmua",
      contextCode: "signed-in-access",
    });
  });

  it("keeps a valid code out of pending storage when signed-in redemption fails", async () => {
    const user = userEvent.setup();
    const account = accountService({
      getAccessState: vi.fn(async () => ({
        session: { email: "student@example.com" },
        packageIds: [],
      })),
      redeemInvite: vi.fn(async () => {
        throw new Error("Access could not be unlocked. Try again later.");
      }),
    });
    const pending = new MemoryPendingInviteStore();
    const router = createAppRouter(["/access"], services(account, pending));
    render(<RouterProvider router={router} />);

    await user.type(
      await screen.findByLabelText("Invitation code"),
      "MANTUO-TMUA-LOCAL-2026-ACCESS",
    );
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Access could not be unlocked. Try again later.");
    expect(pending.load()).toBeNull();
    expect(router.state.location.pathname).toBe("/access");
  });

  it("redeems the pending invite after email confirmation and preserves the return target", async () => {
    const account = accountService();
    const pending = new MemoryPendingInviteStore(
      "MANTUOTMUALOCAL2026ACCESS",
      "/results/ses_email-confirmed",
    );
    const router = createAppRouter(
      ["/auth/confirm?code=confirmation-code"],
      services(account, pending),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Access unlocked" })).toBeInTheDocument();
    expect(account.completeEmailConfirmation).toHaveBeenCalledWith("confirmation-code");
    expect(account.redeemInvite).toHaveBeenCalledWith("MANTUOTMUALOCAL2026ACCESS");
    expect(pending.load()).toBeNull();
    expect(screen.getByRole("link", { name: "Open unlocked content" })).toHaveAttribute(
      "href",
      "/results/ses_email-confirmed",
    );
  });

  it("does not claim entitlement when email confirmation opens without the pending browser code", async () => {
    const account = accountService();
    const router = createAppRouter(
      ["/auth/confirm?code=cross-device-code"],
      services(account, new MemoryPendingInviteStore()),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Email confirmed" })).toBeInTheDocument();
    expect(account.completeEmailConfirmation).toHaveBeenCalledWith("cross-device-code");
    expect(account.redeemInvite).not.toHaveBeenCalled();
    expect(screen.getByText(/No pending invitation was found in this browser/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enter invitation code again" })).toHaveAttribute(
      "href",
      "/access",
    );
  });

  it("fails closed when a deployed account service is missing its CAPTCHA site key", async () => {
    const account = accountService({
      botProtection: { provider: "turnstile", required: true, siteKey: null },
    });
    const router = createAppRouter(
      ["/login"],
      services(account, new MemoryPendingInviteStore()),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Account security verification is not configured",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(account.signIn).not.toHaveBeenCalled();
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
      await screen.findByRole("heading", { name: "No valid access found" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/now linked to your learner account/u)).not.toBeInTheDocument();
  });

  it("reflects a real entitlement on the resources page", async () => {
    const account = accountService();
    const router = createAppRouter(
      ["/exams/tmua/resources"],
      services(account, new MemoryPendingInviteStore()),
    );
    render(<RouterProvider router={router} />);

    expect((await screen.findAllByText(/UNLOCKED.*已解锁/u)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /Open advanced notes.*完成试卷并打开解析/u })).toHaveAttribute(
      "href",
      "/practice/tmua-specimen-p1",
    );
    expect(screen.queryByRole("button", { name: /Get advanced notes.*获取深度笔记/u })).not.toBeInTheDocument();
  });
});
