import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  buildProductFunnelAnalyticsSnapshot,
  productFunnelAnalyticsSince,
} from "../../../src/features/product-funnel/analytics-domain.js";
import { SupabaseProductFunnelAnalyticsService } from "../../../src/features/product-funnel/supabase-analytics-service.js";

describe("privacy-safe product funnel analytics", () => {
  it("fills missing stages and keeps all five exams in a stable product view", () => {
    const snapshot = buildProductFunnelAnalyticsSnapshot([
      { scopeExamId: "all", eventType: "exam_selected", eventCount: 7, uniqueJourneys: 5 },
      { scopeExamId: "tmua", eventType: "practice_completed", eventCount: 3, uniqueJourneys: 2 },
    ]);

    expect(snapshot.overall.stages.exam_selected.uniqueJourneys).toBe(5);
    expect(snapshot.overall.stages.invite_redeemed.uniqueJourneys).toBe(0);
    expect(snapshot.exams.map((exam) => exam.scopeExamId)).toEqual([
      "tmua", "esat", "tara", "lnat", "ucat",
    ]);
    expect(snapshot.exams[0]!.stages.practice_completed.eventCount).toBe(3);
    expect(snapshot.exams[1]!.stages.practice_completed.eventCount).toBe(0);
  });

  it("uses only the approved 7, 30 and 90 day windows", () => {
    const now = new Date("2026-07-19T00:00:00.000Z");
    expect(productFunnelAnalyticsSince(now, 7)).toBe("2026-07-12T00:00:00.000Z");
    expect(productFunnelAnalyticsSince(now, 30)).toBe("2026-06-19T00:00:00.000Z");
    expect(() => productFunnelAnalyticsSince(now, 14 as 7)).toThrow(
      "product_funnel_analytics_period_invalid",
    );
  });
});

describe("Supabase product funnel analytics service", () => {
  it("reads only the viewer context and aggregate stage RPC", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "get_my_product_funnel_viewer_context") {
        return {
          data: [{
            active: true,
            display_name: "创始人",
            permissions: ["view_aggregate_product_funnel"],
          }],
          error: null,
        };
      }
      return {
        data: [{
          scope_exam_id: "tmua",
          event_type: "bingbing_opened",
          event_count: 4,
          unique_journeys: 3,
        }],
        error: null,
      };
    });
    const service = new SupabaseProductFunnelAnalyticsService({ rpc } as unknown as SupabaseClient);

    await expect(service.getContext()).resolves.toEqual({
      active: true,
      displayName: "创始人",
      permissions: ["view_aggregate_product_funnel"],
    });
    await expect(service.loadStageSummary("2026-06-19T00:00:00.000Z")).resolves.toEqual([{
      scopeExamId: "tmua",
      eventType: "bingbing_opened",
      eventCount: 4,
      uniqueJourneys: 3,
    }]);
    expect(rpc).toHaveBeenCalledWith("list_product_funnel_stage_summary", {
      p_since: "2026-06-19T00:00:00.000Z",
    });
  });

  it("fails closed for ordinary students and malformed aggregate rows", async () => {
    const denied = new SupabaseProductFunnelAnalyticsService({
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "product_funnel_viewer_required", code: "42501" },
      })),
    } as unknown as SupabaseClient);
    await expect(denied.loadStageSummary("2026-06-19T00:00:00.000Z")).rejects.toThrow(
      "当前账号没有转化看板权限",
    );

    const malformed = new SupabaseProductFunnelAnalyticsService({
      rpc: vi.fn(async () => ({
        data: [{ scope_exam_id: "student@example.com", event_type: "exam_selected", event_count: 1, unique_journeys: 1 }],
        error: null,
      })),
    } as unknown as SupabaseClient);
    await expect(malformed.loadStageSummary("2026-06-19T00:00:00.000Z")).rejects.toThrow(
      "转化看板数据格式无法验证",
    );
  });
});
