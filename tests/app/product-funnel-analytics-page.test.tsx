import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type { AccountAccessService } from "../../src/features/account/domain.js";
import type { ProductFunnelAnalyticsService } from "../../src/features/product-funnel/analytics-domain.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

const NOW = new Date("2026-07-19T00:00:00.000Z");

function account(authenticated: boolean): AccountAccessService {
  return {
    configured: true,
    botProtection: { provider: "turnstile", required: false, siteKey: null },
    previewInvite: vi.fn(async () => ({ valid: false, label: null, packages: [] })),
    register: vi.fn(async () => ({ status: "confirmation-required" as const, email: "founder@example.com" })),
    signIn: vi.fn(async () => ({ email: "founder@example.com" })),
    completeEmailConfirmation: vi.fn(async () => ({ email: "founder@example.com" })),
    requestPasswordReset: vi.fn(async () => undefined),
    completePasswordRecovery: vi.fn(async () => ({ email: "founder@example.com" })),
    updatePassword: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    redeemInvite: vi.fn(async () => ({ packageIds: [] })),
    getAccessState: vi.fn(async () => ({
      session: authenticated ? { email: "founder@example.com" } : null,
      packageIds: [],
    })),
  };
}

function analytics(active = true): ProductFunnelAnalyticsService {
  return {
    configured: true,
    getContext: vi.fn(async () => ({
      active,
      displayName: active ? "满托创始人" : null,
      permissions: active ? ["view_aggregate_product_funnel"] : [],
    })),
    loadStageSummary: vi.fn(async () => [
      { scopeExamId: "all" as const, eventType: "exam_selected" as const, eventCount: 12, uniqueJourneys: 10 },
      { scopeExamId: "all" as const, eventType: "practice_completed" as const, eventCount: 5, uniqueJourneys: 4 },
      { scopeExamId: "all" as const, eventType: "bingbing_opened" as const, eventCount: 3, uniqueJourneys: 3 },
      { scopeExamId: "all" as const, eventType: "invite_redeemed" as const, eventCount: 2, uniqueJourneys: 2 },
      { scopeExamId: "tmua" as const, eventType: "exam_selected" as const, eventCount: 6, uniqueJourneys: 5 },
      { scopeExamId: "tmua" as const, eventType: "invite_redeemed" as const, eventCount: 2, uniqueJourneys: 2 },
    ]),
  };
}

function services(authenticated: boolean, funnelAnalytics: ProductFunnelAnalyticsService): AppServices {
  return {
    store: { async loadCurrent() { return { session: null, issue: null }; }, async save() { return { persisted: true }; }, async clearCurrent() {} },
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => NOW,
    ids: { sessionId: () => "ses_funnel", eventId: () => "evt_funnel" },
    accountAccess: account(authenticated),
    productFunnelAnalytics: funnelAnalytics,
  };
}

describe("product funnel analytics page", () => {
  it("checks authentication before the separate aggregate-viewer capability", async () => {
    const funnelAnalytics = analytics();
    const router = createAppRouter(["/operations/funnel"], services(false, funnelAnalytics));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "请先登录运营账号" })).toBeInTheDocument();
    expect(funnelAnalytics.getContext).not.toHaveBeenCalled();
  });

  it("fails closed for an ordinary signed-in student", async () => {
    const funnelAnalytics = analytics(false);
    const router = createAppRouter(["/operations/funnel"], services(true, funnelAnalytics));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "当前账号没有转化看板权限" })).toBeInTheDocument();
    expect(screen.getByText(/不随邀请码运营权限自动获得/u)).toBeInTheDocument();
    expect(funnelAnalytics.loadStageSummary).not.toHaveBeenCalled();
  });

  it("shows six aggregate stages, five exams and an honest privacy boundary", async () => {
    const user = userEvent.setup();
    const funnelAnalytics = analytics();
    const router = createAppRouter(["/operations/funnel"], services(true, funnelAnalytics));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /看清学生在哪一步/u })).toBeInTheDocument();
    expect(screen.getByText("满托创始人")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "满托转化概况" })).toHaveTextContent("10");
    expect(screen.getByRole("heading", { name: "六个固定转化动作" })).toBeInTheDocument();
    expect(screen.getAllByText("邀请码核销成功")).not.toHaveLength(0);
    for (const exam of ["TMUA", "ESAT", "TARA", "LNAT", "UCAT"]) {
      expect(screen.getByRole("heading", { level: 3, name: exam })).toBeInTheDocument();
    }
    expect(screen.getByText(/不是学生人数，也不是严格同 cohort 转化率/u)).toBeInTheDocument();
    expect(screen.getByText(/看不到邮箱、课程、答案、IP/u)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("统计时间范围"), "7");
    await waitFor(() => expect(funnelAnalytics.loadStageSummary).toHaveBeenLastCalledWith(
      "2026-07-12T00:00:00.000Z",
    ));
  });
});
