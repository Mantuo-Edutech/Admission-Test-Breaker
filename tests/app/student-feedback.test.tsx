import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type { AccountAccessService } from "../../src/features/account/domain.js";
import type { FeedbackService } from "../../src/features/feedback/domain.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

function account(authenticated: boolean): AccountAccessService {
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
      session: authenticated ? { email: "student@example.com" } : null,
      packageIds: [],
    })),
  };
}

function services(authenticated: boolean, feedback: FeedbackService): AppServices {
  return {
    store: { async loadCurrent() { return { session: null, issue: null }; }, async save() { return { persisted: true }; }, async clearCurrent() {} },
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-18T00:00:00.000Z"),
    ids: { sessionId: () => "ses_feedback", eventId: () => "evt_feedback" },
    accountAccess: account(authenticated),
    feedback,
  };
}

function feedbackService(): FeedbackService {
  return {
    configured: true,
    submit: vi.fn(async () => ({
      id: "12345678-abcd-4abc-8abc-1234567890ab",
      priority: "P2" as const,
      status: "new" as const,
      createdAt: "2026-07-18T10:00:00.000Z",
    })),
    listMine: vi.fn(async () => []),
  };
}

describe("student feedback page", () => {
  it("prefills question context and returns a private ticket receipt", async () => {
    const user = userEvent.setup();
    const feedback = feedbackService();
    const router = createAppRouter([
      "/feedback?exam=tmua&from=%2Fpractice%2Ftmua-specimen-p1&resource=tmua-specimen-p1&question=tmua-specimen-p1-q01",
    ], services(true, feedback));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /Tell us exactly what happened/u })).toBeInTheDocument();
    expect(screen.getByText("TMUA · tmua-specimen-p1-q01")).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: /Content error/u })).toBeChecked();

    await user.type(screen.getByLabelText(/Include: what you did/u), "这道题的 B 选项公式少了负号，请依据原始资料核对。");
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    expect(feedback.submit).toHaveBeenCalledWith({
      category: "content_error",
      examId: "tmua",
      route: "/practice/tmua-specimen-p1",
      resourceId: "tmua-specimen-p1",
      questionId: "tmua-specimen-p1-q01",
      message: "这道题的 B 选项公式少了负号，请依据原始资料核对。",
    });
    expect(await screen.findByRole("heading", { name: "FB-12345678" })).toBeInTheDocument();
    expect(screen.getByText(/Repeating the same report will not create duplicate tickets/u)).toBeInTheDocument();
  });

  it("requires login for private tracking and keeps Bingbing as an explicit fallback", async () => {
    const router = createAppRouter(["/feedback?exam=esat&from=%2Fexams%2Fesat"], services(false, feedbackService()));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Sign in to submit and track feedback" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in and continue" })).toHaveAttribute("href", "/login");
    expect(screen.getByAltText("Bingbing's WeChat QR code")).toBeInTheDocument();
    expect(screen.getByText(/are not attached automatically/u)).toBeInTheDocument();
  });
});
