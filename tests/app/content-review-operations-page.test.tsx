import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AppServices } from "../../src/app/dependencies.js";
import { createAppRouter } from "../../src/app/routes.js";
import type { AccountAccessService } from "../../src/features/account/domain.js";
import type {
  ContentReviewOperationsService,
  ContentReviewQueueItem,
} from "../../src/features/content-review-operations/domain.js";
import { FIXED_GUEST_SPACE_STORE } from "../support/fixed-guest-space-store.js";
import { FIXED_PREPARATION_PROFILE_STORE } from "../support/fixed-preparation-profile-store.js";

const items: readonly ContentReviewQueueItem[] = [
  {
    reviewKey: "tmua-online/independent-math",
    campaignId: "academic-content",
    ownerRole: "content-review-lead",
    independenceRequired: true,
    evidenceRequirement: "独立数学老师逐题核对全部题目、答案、术语与当前来源。",
    viewports: ["content"],
    products: [{ productId: "tmua-past-papers", examId: "tmua", version: "1.0.0", route: "/exams/tmua/past-papers" }],
    sourceFingerprint: `sha256:${"a".repeat(64)}`,
    sourceArtifactCount: 18,
    catalogRevision: "2026-07-19.33",
  },
  {
    reviewKey: "esat-notes/device-review",
    campaignId: "device-accessibility",
    ownerRole: "interface-qa-lead",
    independenceRequired: false,
    evidenceRequirement: "在电脑、iPad 和手机上检查公式、长文、键盘与触控可用性。",
    viewports: ["desktop", "ipad", "phone"],
    products: [{ productId: "esat-math-notes", examId: "esat", version: "1.0.0", route: "/exams/esat/notes/mathematics" }],
    sourceFingerprint: `sha256:${"b".repeat(64)}`,
    sourceArtifactCount: 5,
    catalogRevision: "2026-07-19.33",
  },
];

function account(authenticated: boolean): AccountAccessService {
  return {
    configured: true,
    botProtection: { provider: "turnstile", required: false, siteKey: null },
    previewInvite: vi.fn(async () => ({ valid: false, label: null, packages: [] })),
    register: vi.fn(async () => ({ status: "confirmation-required" as const, email: "reviewer@example.com" })),
    signIn: vi.fn(async () => ({ email: "reviewer@example.com" })),
    completeEmailConfirmation: vi.fn(async () => ({ email: "reviewer@example.com" })),
    requestPasswordReset: vi.fn(async () => undefined),
    completePasswordRecovery: vi.fn(async () => ({ email: "reviewer@example.com" })),
    updatePassword: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    redeemInvite: vi.fn(async () => ({ packageIds: [] })),
    getAccessState: vi.fn(async () => ({ session: authenticated ? { email: "reviewer@example.com" } : null, packageIds: [] })),
  };
}

function review(active = true): ContentReviewOperationsService {
  return {
    configured: true,
    getContext: vi.fn(async () => ({
      active,
      displayName: active ? "满托教研负责人" : null,
      permissions: active ? ["view_content_review_queue", "prepare_review_packet"] : [],
    })),
    loadSummary: vi.fn(async () => ({
      catalogRevision: "2026-07-19.33",
      pendingReviewItems: 68,
      affectedPublicProducts: 40,
      academicContentItems: 25,
      studentCalibrationItems: 12,
      deviceAccessibilityItems: 31,
    })),
    listQueue: vi.fn(async () => items),
  };
}

function services(authenticated: boolean, contentReviewOperations: ContentReviewOperationsService): AppServices {
  return {
    store: { async loadCurrent() { return { session: null, issue: null }; }, async save() { return { persisted: true }; }, async clearCurrent() {} },
    guestSpaceStore: FIXED_GUEST_SPACE_STORE,
    profileStore: FIXED_PREPARATION_PROFILE_STORE,
    now: () => new Date("2026-07-19T08:30:00.000Z"),
    ids: { sessionId: () => "ses_review", eventId: () => "evt_review" },
    accountAccess: account(authenticated),
    contentReviewOperations,
  };
}

describe("content review operations page", () => {
  it("checks authentication before asking for the independent review capability", async () => {
    const contentReview = review();
    const router = createAppRouter(["/operations/content-review"], services(false, contentReview));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "请先登录审核账号" })).toBeInTheDocument();
    expect(contentReview.getContext).not.toHaveBeenCalled();
  });

  it("fails closed for an ordinary signed-in student", async () => {
    const contentReview = review(false);
    const router = createAppRouter(["/operations/content-review"], services(true, contentReview));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "当前账号没有内容审核权限" })).toBeInTheDocument();
    expect(screen.getByText(/邀请码运营和转化看板权限都不会自动开放/u)).toBeInTheDocument();
    expect(contentReview.listQueue).not.toHaveBeenCalled();
  });

  it("shows the current source-bound queue, exact product routes and honest release boundary", async () => {
    const user = userEvent.setup();
    const contentReview = review();
    const router = createAppRouter(["/operations/content-review"], services(true, contentReview));
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: /每一份资料/u })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "内容审核概况" })).toHaveTextContent("68");
    expect(screen.getByRole("region", { name: "内容审核概况" })).toHaveTextContent("40");
    const queue = screen.getByRole("region", { name: /逐项打开/u });
    expect(within(queue).getByRole("link", { name: /tmua-past-papers/u })).toHaveAttribute("href", "/exams/tmua/past-papers");
    expect(within(queue).getByRole("link", { name: /esat-math-notes/u })).toHaveAttribute("href", "/exams/esat/notes/mathematics");
    expect(screen.getByRole("heading", { name: "下载模板不等于审核通过" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("考试"), "tmua");
    expect(screen.getByText("显示 1 / 2 项")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /esat-math-notes/u })).not.toBeInTheDocument();
    expect(contentReview.loadSummary).toHaveBeenCalledOnce();
    expect(contentReview.listQueue).toHaveBeenCalledWith();
  });
});
