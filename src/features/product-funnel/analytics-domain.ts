import {
  PRODUCT_FUNNEL_EVENT_TYPES,
  PRODUCT_FUNNEL_EXAM_IDS,
  type ProductFunnelEventType,
  type ProductFunnelExamId,
} from "./domain.js";

export const PRODUCT_FUNNEL_ANALYTICS_PERIODS = [7, 30, 90] as const;
export type ProductFunnelAnalyticsPeriod = (typeof PRODUCT_FUNNEL_ANALYTICS_PERIODS)[number];
export type ProductFunnelAnalyticsScope = ProductFunnelExamId | "all";

export interface ProductFunnelAnalyticsContext {
  readonly active: boolean;
  readonly displayName: string | null;
  readonly permissions: readonly string[];
}

export interface ProductFunnelStageSummaryRow {
  readonly scopeExamId: ProductFunnelAnalyticsScope;
  readonly eventType: ProductFunnelEventType;
  readonly eventCount: number;
  readonly uniqueJourneys: number;
}

export interface ProductFunnelAnalyticsService {
  readonly configured: true;
  getContext(): Promise<ProductFunnelAnalyticsContext>;
  loadStageSummary(since: string): Promise<readonly ProductFunnelStageSummaryRow[]>;
}

export interface ProductFunnelStageDefinition {
  readonly eventType: ProductFunnelEventType;
  readonly labelZh: string;
  readonly labelEn: string;
  readonly explanation: string;
}

export const PRODUCT_FUNNEL_STAGE_DEFINITIONS: readonly ProductFunnelStageDefinition[] = [
  {
    eventType: "exam_selected",
    labelZh: "选择考试",
    labelEn: "EXAM SELECTED",
    explanation: "在首页或考试入口主动选择一项考试",
  },
  {
    eventType: "profile_completed",
    labelZh: "完成本人档案",
    labelEn: "PROFILE COMPLETED",
    explanation: "保存课程体系、模块或备考背景",
  },
  {
    eventType: "practice_started",
    labelZh: "开始在线练习",
    labelEn: "PRACTICE STARTED",
    explanation: "进入一份原生题卷并开始会话",
  },
  {
    eventType: "practice_completed",
    labelZh: "完成在线练习",
    labelEn: "PRACTICE COMPLETED",
    explanation: "提交题卷并取得事实型基础结果",
  },
  {
    eventType: "bingbing_opened",
    labelZh: "主动联系冰冰",
    labelEn: "BINGBING OPENED",
    explanation: "主动打开冰冰微信二维码",
  },
  {
    eventType: "invite_redeemed",
    labelZh: "邀请码核销成功",
    labelEn: "INVITE REDEEMED",
    explanation: "注册或登录后成功获得真实资料权限",
  },
] as const;

export interface ProductFunnelScopeSnapshot {
  readonly scopeExamId: ProductFunnelAnalyticsScope;
  readonly stages: Readonly<Record<ProductFunnelEventType, ProductFunnelStageSummaryRow>>;
}

export interface ProductFunnelAnalyticsSnapshot {
  readonly overall: ProductFunnelScopeSnapshot;
  readonly exams: readonly ProductFunnelScopeSnapshot[];
}

function emptyRow(
  scopeExamId: ProductFunnelAnalyticsScope,
  eventType: ProductFunnelEventType,
): ProductFunnelStageSummaryRow {
  return { scopeExamId, eventType, eventCount: 0, uniqueJourneys: 0 };
}

function scopeSnapshot(
  scopeExamId: ProductFunnelAnalyticsScope,
  rows: readonly ProductFunnelStageSummaryRow[],
): ProductFunnelScopeSnapshot {
  const matchingRows = new Map(
    rows
      .filter((row) => row.scopeExamId === scopeExamId)
      .map((row) => [row.eventType, row]),
  );
  return {
    scopeExamId,
    stages: Object.fromEntries(
      PRODUCT_FUNNEL_EVENT_TYPES.map((eventType) => [
        eventType,
        matchingRows.get(eventType) ?? emptyRow(scopeExamId, eventType),
      ]),
    ) as Readonly<Record<ProductFunnelEventType, ProductFunnelStageSummaryRow>>,
  };
}

export function buildProductFunnelAnalyticsSnapshot(
  rows: readonly ProductFunnelStageSummaryRow[],
): ProductFunnelAnalyticsSnapshot {
  return {
    overall: scopeSnapshot("all", rows),
    exams: PRODUCT_FUNNEL_EXAM_IDS.map((examId) => scopeSnapshot(examId, rows)),
  };
}

export function productFunnelAnalyticsSince(
  now: Date,
  period: ProductFunnelAnalyticsPeriod,
): string {
  if (!(PRODUCT_FUNNEL_ANALYTICS_PERIODS as readonly number[]).includes(period)) {
    throw new Error("product_funnel_analytics_period_invalid");
  }
  return new Date(now.getTime() - period * 24 * 60 * 60 * 1_000).toISOString();
}
