import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FEEDBACK_CATEGORIES,
  isFeedbackExamId,
  type FeedbackCategory,
  type FeedbackPriority,
  type FeedbackService,
  type FeedbackStatus,
  type StudentFeedbackReceipt,
  type StudentFeedbackRecord,
  type SubmitFeedbackInput,
} from "./domain.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPriority(value: unknown): value is FeedbackPriority {
  return value === "P1" || value === "P2" || value === "P3" || value === "P4";
}

function isStatus(value: unknown): value is FeedbackStatus {
  return value === "new" || value === "triaged" || value === "in_progress" || value === "resolved" || value === "closed";
}

function isCategory(value: unknown): value is FeedbackCategory {
  return typeof value === "string" && FEEDBACK_CATEGORIES.includes(value as FeedbackCategory);
}

function receiptFromRow(value: unknown): StudentFeedbackReceipt {
  if (!isRecord(value)) throw new Error("反馈回执格式无法验证");
  const id = value.feedback_id ?? value.id;
  const createdAt = value.created_at ?? value.createdAt;
  if (
    typeof id !== "string"
    || !isPriority(value.priority)
    || !isStatus(value.status)
    || typeof createdAt !== "string"
  ) {
    throw new Error("反馈回执内容不完整");
  }
  return { id, priority: value.priority, status: value.status, createdAt };
}

function recordFromRow(value: unknown): StudentFeedbackRecord {
  if (!isRecord(value)) throw new Error("反馈记录格式无法验证");
  const receipt = receiptFromRow(value);
  const examId = typeof value.exam_id === "string" && isFeedbackExamId(value.exam_id)
    ? value.exam_id
    : undefined;
  if (
    !isCategory(value.category)
    || typeof value.route !== "string"
    || typeof value.message !== "string"
    || typeof value.updated_at !== "string"
  ) {
    throw new Error("反馈记录内容不完整");
  }
  return {
    ...receipt,
    category: value.category,
    route: value.route,
    message: value.message,
    updatedAt: value.updated_at,
    ...(examId === undefined ? {} : { examId }),
    ...(typeof value.resource_id === "string" ? { resourceId: value.resource_id } : {}),
    ...(typeof value.question_id === "string" ? { questionId: value.question_id } : {}),
    ...(typeof value.resolved_at === "string" ? { resolvedAt: value.resolved_at } : {}),
  };
}

function feedbackError(error: { message?: string; code?: string }): Error {
  const message = error.message ?? "";
  if (message.includes("authentication_required") || error.code === "42501") {
    return new Error("请先登录，再提交反馈");
  }
  if (message.includes("contains_contact_details")) {
    return new Error("请不要填写邮箱、手机号或其他联系方式；我们会通过站内回执处理");
  }
  if (message.includes("message_length")) {
    return new Error("请用 10–2000 个字描述具体问题");
  }
  return new Error("反馈暂时没有提交成功，请稍后再试");
}

export class SupabaseFeedbackService implements FeedbackService {
  readonly configured = true;

  constructor(private readonly client: SupabaseClient) {}

  async submit(input: SubmitFeedbackInput): Promise<StudentFeedbackReceipt> {
    const { data, error } = await this.client.rpc("submit_student_feedback", {
      p_category: input.category,
      p_exam_id: input.examId ?? null,
      p_route: input.route,
      p_resource_id: input.resourceId ?? null,
      p_question_id: input.questionId ?? null,
      p_message: input.message,
    });
    if (error !== null) throw feedbackError(error);
    const first = Array.isArray(data) ? data[0] : data;
    return receiptFromRow(first);
  }

  async listMine(): Promise<readonly StudentFeedbackRecord[]> {
    const { data, error } = await this.client
      .from("student_feedback")
      .select("id,category,priority,exam_id,route,resource_id,question_id,message,status,created_at,updated_at,resolved_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error !== null) throw feedbackError(error);
    return (data ?? []).map(recordFromRow);
  }
}
