import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseContentReviewOperationsService } from "../../../src/features/content-review-operations/supabase-content-review-operations-service.js";

describe("Supabase content review operations service", () => {
  it("parses its independent reviewer context", async () => {
    const rpc = vi.fn(async () => ({ data: [{
      active: true,
      display_name: "满托教研负责人",
      permissions: ["view_content_review_queue", "prepare_review_packet"],
    }], error: null }));
    const service = new SupabaseContentReviewOperationsService({ rpc } as unknown as SupabaseClient);
    await expect(service.getContext()).resolves.toMatchObject({ active: true, displayName: "满托教研负责人" });
    expect(rpc).toHaveBeenCalledWith("get_my_content_review_viewer_context");
  });

  it("loads exact queue counts without treating them as approvals", async () => {
    const service = new SupabaseContentReviewOperationsService({
      rpc: vi.fn(async () => ({ data: [{
        catalog_revision: "2026-07-19.33",
        pending_review_items: 68,
        affected_public_products: 40,
        academic_content_items: 25,
        student_calibration_items: 12,
        device_accessibility_items: 31,
      }], error: null })),
    } as unknown as SupabaseClient);
    await expect(service.loadSummary()).resolves.toEqual({
      catalogRevision: "2026-07-19.33",
      pendingReviewItems: 68,
      affectedPublicProducts: 40,
      academicContentItems: 25,
      studentCalibrationItems: 12,
      deviceAccessibilityItems: 31,
    });
  });

  it("validates every route, fingerprint and product in the server queue", async () => {
    const rpc = vi.fn(async () => ({ data: [{
      review_key: "feature/check",
      campaign_id: "academic-content",
      owner_role: "content-review-lead",
      independence_required: true,
      evidence_requirement: "Independent subject review of every current question and answer.",
      viewports: ["content"],
      products: [{ productId: "tmua-paper", examId: "tmua", version: "1.0.0", route: "/practice/tmua-paper" }],
      source_fingerprint: `sha256:${"b".repeat(64)}`,
      source_artifact_count: 4,
      catalog_revision: "2026-07-19.33",
    }], error: null }));
    const service = new SupabaseContentReviewOperationsService({ rpc } as unknown as SupabaseClient);
    await expect(service.listQueue("academic-content")).resolves.toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith("list_content_review_queue", {
      p_campaign_id: "academic-content",
      p_limit: 200,
    });

    const malformed = new SupabaseContentReviewOperationsService({
      rpc: vi.fn(async () => ({ data: [{
        review_key: "feature/check",
        campaign_id: "academic-content",
        owner_role: "content-review-lead",
        independence_required: true,
        evidence_requirement: "Independent review is required for this source.",
        viewports: [],
        products: [{ productId: "tmua-paper", examId: "tmua", version: "1", route: "https://external.test" }],
        source_fingerprint: "not-a-fingerprint",
        source_artifact_count: 1,
        catalog_revision: "2026-07-19.33",
      }], error: null })),
    } as unknown as SupabaseClient);
    await expect(malformed.listQueue()).rejects.toThrow("内容审核数据格式无法验证");
  });

  it("fails closed for an account without the independent capability", async () => {
    const service = new SupabaseContentReviewOperationsService({
      rpc: vi.fn(async () => ({ data: null, error: { code: "42501", message: "content_review_viewer_required" } })),
    } as unknown as SupabaseClient);
    await expect(service.listQueue()).rejects.toThrow("当前账号没有内容审核权限");
  });
});
