import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CONTENT_REVIEW_CAMPAIGNS,
  type ContentReviewCampaignId,
  type ContentReviewOperationsContext,
  type ContentReviewOperationsService,
  type ContentReviewProductScope,
  type ContentReviewQueueItem,
  type ContentReviewQueueSummary,
} from "./domain.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function firstRow(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) ? value[0] : value;
  if (!isRecord(row)) throw new Error("内容审核数据格式无法验证");
  return row;
}

function stringValue(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("内容审核数据格式无法验证");
  }
  return value;
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("内容审核数据格式无法验证");
  }
  return value;
}

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error("内容审核数据格式无法验证");
  return parsed;
}

function campaignId(value: unknown): ContentReviewCampaignId {
  if (typeof value !== "string" || !(CONTENT_REVIEW_CAMPAIGNS as readonly string[]).includes(value)) {
    throw new Error("内容审核数据格式无法验证");
  }
  return value as ContentReviewCampaignId;
}

function productScope(value: unknown): ContentReviewProductScope {
  if (!isRecord(value)) throw new Error("内容审核数据格式无法验证");
  const route = stringValue(value.route);
  if (!route.startsWith("/") || route.startsWith("//")) {
    throw new Error("内容审核数据格式无法验证");
  }
  return {
    productId: stringValue(value.productId),
    examId: stringValue(value.examId),
    version: stringValue(value.version),
    route,
  };
}

function queueItem(value: unknown): ContentReviewQueueItem {
  if (!isRecord(value) || !Array.isArray(value.products) || value.products.length === 0) {
    throw new Error("内容审核数据格式无法验证");
  }
  const sourceFingerprint = stringValue(value.source_fingerprint);
  if (!/^sha256:[0-9a-f]{64}$/u.test(sourceFingerprint)) {
    throw new Error("内容审核数据格式无法验证");
  }
  return {
    reviewKey: stringValue(value.review_key),
    campaignId: campaignId(value.campaign_id),
    ownerRole: stringValue(value.owner_role),
    independenceRequired: value.independence_required === true,
    evidenceRequirement: stringValue(value.evidence_requirement),
    viewports: stringArray(value.viewports),
    products: value.products.map(productScope),
    sourceFingerprint,
    sourceArtifactCount: numberValue(value.source_artifact_count),
    catalogRevision: stringValue(value.catalog_revision),
  };
}

function reviewError(error: { message?: string; code?: string }): Error {
  if (error.message?.includes("content_review_viewer_required") || error.code === "42501") {
    return new Error("当前账号没有内容审核权限");
  }
  if (error.message?.includes("content_review_campaign_invalid")) {
    return new Error("内容审核类型无效");
  }
  return new Error("内容审核服务暂时不可用，请稍后重试");
}

export class SupabaseContentReviewOperationsService implements ContentReviewOperationsService {
  readonly configured = true as const;

  constructor(private readonly client: SupabaseClient) {}

  async getContext(): Promise<ContentReviewOperationsContext> {
    const { data, error } = await this.client.rpc("get_my_content_review_viewer_context");
    if (error !== null) throw reviewError(error);
    const row = firstRow(data);
    if (typeof row.active !== "boolean") throw new Error("内容审核数据格式无法验证");
    return {
      active: row.active,
      displayName: typeof row.display_name === "string" ? row.display_name : null,
      permissions: stringArray(row.permissions ?? []),
    };
  }

  async loadSummary(): Promise<ContentReviewQueueSummary> {
    const { data, error } = await this.client.rpc("get_content_review_queue_summary");
    if (error !== null) throw reviewError(error);
    const row = firstRow(data);
    return {
      catalogRevision: typeof row.catalog_revision === "string" ? row.catalog_revision : null,
      pendingReviewItems: numberValue(row.pending_review_items),
      affectedPublicProducts: numberValue(row.affected_public_products),
      academicContentItems: numberValue(row.academic_content_items),
      studentCalibrationItems: numberValue(row.student_calibration_items),
      deviceAccessibilityItems: numberValue(row.device_accessibility_items),
    };
  }

  async listQueue(campaign?: ContentReviewCampaignId): Promise<readonly ContentReviewQueueItem[]> {
    const { data, error } = await this.client.rpc("list_content_review_queue", {
      p_campaign_id: campaign ?? null,
      p_limit: 200,
    });
    if (error !== null) throw reviewError(error);
    if (!Array.isArray(data)) throw new Error("内容审核数据格式无法验证");
    return data.map(queueItem);
  }
}
