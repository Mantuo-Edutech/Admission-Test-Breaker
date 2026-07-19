import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRODUCT_FUNNEL_EVENT_TYPES,
  PRODUCT_FUNNEL_EXAM_IDS,
  type ProductFunnelEventType,
  type ProductFunnelExamId,
} from "./domain.js";
import type {
  ProductFunnelAnalyticsContext,
  ProductFunnelAnalyticsScope,
  ProductFunnelAnalyticsService,
  ProductFunnelStageSummaryRow,
} from "./analytics-domain.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function firstRow(value: unknown): Record<string, unknown> {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!isRecord(candidate)) throw new Error("转化看板数据格式无法验证");
  return candidate;
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("转化看板数据格式无法验证");
  }
  return value;
}

function safeCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("转化看板数据格式无法验证");
  }
  return parsed;
}

function analyticsError(error: { message?: string; code?: string }): Error {
  if (error.message?.includes("product_funnel_viewer_required") || error.code === "42501") {
    return new Error("当前账号没有转化看板权限");
  }
  if (error.message?.includes("product_funnel_summary_window_invalid")) {
    return new Error("转化看板只支持最近 90 天的聚合数据");
  }
  return new Error("转化看板暂时无法连接，请稍后再试");
}

function contextFromRow(value: unknown): ProductFunnelAnalyticsContext {
  const row = firstRow(value);
  if (typeof row.active !== "boolean") throw new Error("转化看板数据格式无法验证");
  return {
    active: row.active,
    displayName: typeof row.display_name === "string" ? row.display_name : null,
    permissions: stringArray(row.permissions ?? []),
  };
}

function scopeExamId(value: unknown): ProductFunnelAnalyticsScope {
  if (value === "all") return "all";
  if (typeof value === "string" && (PRODUCT_FUNNEL_EXAM_IDS as readonly string[]).includes(value)) {
    return value as ProductFunnelExamId;
  }
  throw new Error("转化看板数据格式无法验证");
}

function eventType(value: unknown): ProductFunnelEventType {
  if (typeof value === "string" && (PRODUCT_FUNNEL_EVENT_TYPES as readonly string[]).includes(value)) {
    return value as ProductFunnelEventType;
  }
  throw new Error("转化看板数据格式无法验证");
}

function summaryRow(value: unknown): ProductFunnelStageSummaryRow {
  if (!isRecord(value)) throw new Error("转化看板数据格式无法验证");
  return {
    scopeExamId: scopeExamId(value.scope_exam_id),
    eventType: eventType(value.event_type),
    eventCount: safeCount(value.event_count),
    uniqueJourneys: safeCount(value.unique_journeys),
  };
}

export class SupabaseProductFunnelAnalyticsService implements ProductFunnelAnalyticsService {
  readonly configured = true as const;

  constructor(private readonly client: SupabaseClient) {}

  async getContext(): Promise<ProductFunnelAnalyticsContext> {
    const { data, error } = await this.client.rpc("get_my_product_funnel_viewer_context");
    if (error !== null) throw analyticsError(error);
    return contextFromRow(data);
  }

  async loadStageSummary(since: string): Promise<readonly ProductFunnelStageSummaryRow[]> {
    const { data, error } = await this.client.rpc("list_product_funnel_stage_summary", {
      p_since: since,
    });
    if (error !== null) throw analyticsError(error);
    if (!Array.isArray(data)) throw new Error("转化看板数据格式无法验证");
    return data.map(summaryRow);
  }
}
