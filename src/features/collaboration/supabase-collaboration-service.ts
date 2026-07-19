import type { SupabaseClient } from "@supabase/supabase-js";
import type { PracticeExamId } from "../practice/catalog/assessment-registry.js";
import {
  collaborationArtifactKinds,
  collaborationExamIds,
  collaborationScopes,
  collaborationSubjectKinds,
  type CollaborationArtifact,
  type CollaborationArtifactKind,
  type CollaborationAuditEvent,
  type CollaborationAuditEventType,
  type CollaborationGrantSummary,
  type CollaborationInviteSummary,
  type CollaborationScope,
  type CollaborationService,
  type CollaborationSubjectKind,
  type CreateCollaborationArtifactInput,
  type IssueCollaborationInviteInput,
  type IssuedCollaborationInvite,
  type SharedLearnerAccess,
  type SharedProgress,
  type SharedProgressSession,
  type SharedResponseSession,
} from "./domain.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function rows(value: unknown): readonly Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new Error("协作授权数据格式无法验证");
  }
  return value;
}

function firstRow(value: unknown): Record<string, unknown> {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!isRecord(candidate)) throw new Error("协作授权数据格式无法验证");
  return candidate;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("协作授权数据格式无法验证");
  }
  return value;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return requiredString(value);
}

function requiredNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("协作授权数据格式无法验证");
  return parsed;
}

function subjectKind(value: unknown): CollaborationSubjectKind {
  if (typeof value !== "string" || !collaborationSubjectKinds.includes(value as CollaborationSubjectKind)) {
    throw new Error("协作授权数据格式无法验证");
  }
  return value as CollaborationSubjectKind;
}

function scopeArray(value: unknown): readonly CollaborationScope[] {
  if (!Array.isArray(value) || value.some(
    (item) => typeof item !== "string" || !collaborationScopes.includes(item as CollaborationScope),
  )) throw new Error("协作授权数据格式无法验证");
  return value as CollaborationScope[];
}

function examId(value: unknown): PracticeExamId {
  if (typeof value !== "string" || !collaborationExamIds.includes(value as PracticeExamId)) {
    throw new Error("协作授权数据格式无法验证");
  }
  return value as PracticeExamId;
}

function examArray(value: unknown): readonly PracticeExamId[] {
  if (!Array.isArray(value)) throw new Error("协作授权数据格式无法验证");
  return value.map(examId);
}

function stringRecord(value: unknown): Readonly<Record<string, string>> {
  if (!isRecord(value) || Object.values(value).some((item) => typeof item !== "string")) {
    throw new Error("协作授权数据格式无法验证");
  }
  return value as Record<string, string>;
}

function numberRecord(value: unknown): Readonly<Record<string, number>> {
  if (!isRecord(value)) throw new Error("协作授权数据格式无法验证");
  const output: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error("协作授权数据格式无法验证");
    output[key] = parsed;
  }
  return output;
}

function collaborationError(error: { message?: string; code?: string }): Error {
  const message = error.message ?? "";
  if (message.includes("authentication_required") || error.code === "PGRST301") {
    return new Error("请先登录，再使用协作授权");
  }
  if (message.includes("collaboration_grant_required") || error.code === "42501") {
    return new Error("当前账号没有这项权限，或授权已经撤销、过期");
  }
  if (message.includes("collaboration_code_redeemed")) return new Error("这个协作码已经由其他账号使用");
  if (message.includes("collaboration_code_invalid")) return new Error("协作码无效、已过期或已经撤销");
  if (message.includes("collaboration_self_grant_forbidden")) return new Error("不能用自己的账号兑换自己创建的协作码");
  if (message.includes("collaboration_scopes_invalid")) return new Error("请至少选择一项明确权限");
  if (message.includes("collaboration_exams_invalid")) return new Error("请至少选择一项考试");
  if (message.includes("collaboration_duration_invalid")) return new Error("授权有效期必须为 1–180 天");
  if (message.includes("collaboration_invite_not_found")) return new Error("协作邀请不存在或已经不能撤销");
  if (message.includes("collaboration_grant_not_found")) return new Error("协作授权不存在或已经撤销");
  if (message.includes("collaboration_artifact_content_invalid")) return new Error("标题需要 2–80 字，正文需要 1–2000 字");
  if (message.includes("collaboration_artifact_due_invalid")) return new Error("截止时间必须晚于现在");
  return new Error("协作授权服务暂时不可用，请稍后再试");
}

function inviteFromRow(row: Record<string, unknown>): CollaborationInviteSummary {
  const status = row.status;
  if (status !== "pending" && status !== "redeemed" && status !== "revoked" && status !== "expired") {
    throw new Error("协作授权数据格式无法验证");
  }
  return {
    id: requiredString(row.invite_id),
    subjectKind: subjectKind(row.subject_kind),
    scopes: scopeArray(row.scopes),
    examIds: examArray(row.exam_ids),
    status,
    createdAt: requiredString(row.created_at),
    inviteExpiresAt: requiredString(row.invite_expires_at),
    redeemedAt: nullableString(row.redeemed_at),
  };
}

function grantFromRow(row: Record<string, unknown>): CollaborationGrantSummary {
  const status = row.status;
  if (status !== "active" && status !== "expired" && status !== "revoked") {
    throw new Error("协作授权数据格式无法验证");
  }
  return {
    id: requiredString(row.grant_id),
    subjectKind: subjectKind(row.subject_kind),
    subjectReference: requiredString(row.subject_reference),
    scopes: scopeArray(row.scopes),
    examIds: examArray(row.exam_ids),
    startsAt: requiredString(row.starts_at),
    expiresAt: requiredString(row.expires_at),
    revokedAt: nullableString(row.revoked_at),
    status,
  };
}

function sharedAccessFromRow(row: Record<string, unknown>): SharedLearnerAccess {
  return {
    grantId: requiredString(row.grant_id),
    learnerReference: requiredString(row.learner_reference),
    subjectKind: subjectKind(row.subject_kind),
    scopes: scopeArray(row.scopes),
    examIds: examArray(row.exam_ids),
    expiresAt: requiredString(row.expires_at),
  };
}

function progressFromRow(row: Record<string, unknown>): SharedProgressSession {
  const status = row.status;
  if (status !== "active" && status !== "submitted" && status !== "expired") {
    throw new Error("协作授权数据格式无法验证");
  }
  return {
    sessionId: requiredString(row.session_id),
    paperId: requiredString(row.paper_id),
    status,
    startedAt: requiredString(row.started_at),
    submittedAt: nullableString(row.submitted_at),
    answeredCount: requiredNumber(row.answered_count),
    activeMs: requiredNumber(row.active_ms),
    answerChanges: requiredNumber(row.answer_changes),
    lastActivityAt: requiredString(row.last_activity_at),
  };
}

function responseFromRow(row: Record<string, unknown>): SharedResponseSession {
  const status = row.status;
  if (status !== "active" && status !== "submitted" && status !== "expired") {
    throw new Error("协作授权数据格式无法验证");
  }
  return {
    sessionId: requiredString(row.session_id),
    paperId: requiredString(row.paper_id),
    status,
    startedAt: requiredString(row.started_at),
    submittedAt: nullableString(row.submitted_at),
    answers: stringRecord(row.answers),
    timingByQuestionMs: numberRecord(row.timing_by_question_ms),
  };
}

function artifactFromRow(row: Record<string, unknown>): CollaborationArtifact {
  const kind = row.kind;
  if (typeof kind !== "string" || !collaborationArtifactKinds.includes(kind as CollaborationArtifactKind)) {
    throw new Error("协作授权数据格式无法验证");
  }
  return {
    id: requiredString(row.artifact_id),
    grantId: requiredString(row.grant_id),
    kind: kind as CollaborationArtifactKind,
    examId: examId(row.exam_id),
    title: requiredString(row.title),
    body: requiredString(row.body),
    dueAt: nullableString(row.due_at),
    authorReference: requiredString(row.author_reference),
    createdAt: requiredString(row.created_at),
  };
}

const auditEventTypes: readonly CollaborationAuditEventType[] = [
  "invite_created", "invite_revoked", "grant_redeemed", "grant_revoked",
  "progress_viewed", "responses_viewed", "annotation_created", "plan_created", "assignment_created",
];

function auditFromRow(row: Record<string, unknown>): CollaborationAuditEvent {
  const eventType = row.event_type;
  if (typeof eventType !== "string" || !auditEventTypes.includes(eventType as CollaborationAuditEventType)) {
    throw new Error("协作授权数据格式无法验证");
  }
  return {
    eventType: eventType as CollaborationAuditEventType,
    grantId: nullableString(row.grant_id),
    actorReference: requiredString(row.actor_reference),
    examId: row.exam_id === null || row.exam_id === undefined ? null : examId(row.exam_id),
    occurredAt: requiredString(row.occurred_at),
  };
}

export class SupabaseCollaborationService implements CollaborationService {
  readonly configured = true as const;

  constructor(private readonly client: SupabaseClient) {}

  async issueInvite(input: IssueCollaborationInviteInput): Promise<IssuedCollaborationInvite> {
    const { data, error } = await this.client.rpc("issue_my_collaboration_invite", {
      p_subject_kind: input.subjectKind,
      p_scopes: [...input.scopes],
      p_exam_ids: [...input.examIds],
      p_grant_days: input.grantDays,
    });
    if (error !== null) throw collaborationError(error);
    const row = firstRow(data);
    return {
      id: requiredString(row.invite_id),
      code: requiredString(row.code),
      inviteExpiresAt: requiredString(row.invite_expires_at),
    };
  }

  async listMyInvites(): Promise<readonly CollaborationInviteSummary[]> {
    const { data, error } = await this.client.rpc("list_my_collaboration_invites");
    if (error !== null) throw collaborationError(error);
    return rows(data).map(inviteFromRow);
  }

  async cancelMyInvite(inviteId: string): Promise<void> {
    const { error } = await this.client.rpc("cancel_my_collaboration_invite", { p_invite_id: inviteId });
    if (error !== null) throw collaborationError(error);
  }

  async listMyGrants(): Promise<readonly CollaborationGrantSummary[]> {
    const { data, error } = await this.client.rpc("list_my_collaboration_grants");
    if (error !== null) throw collaborationError(error);
    return rows(data).map(grantFromRow);
  }

  async revokeMyGrant(grantId: string): Promise<void> {
    const { error } = await this.client.rpc("revoke_my_collaboration_grant", { p_grant_id: grantId });
    if (error !== null) throw collaborationError(error);
  }

  async listMyAudit(limit = 50): Promise<readonly CollaborationAuditEvent[]> {
    const { data, error } = await this.client.rpc("list_my_collaboration_audit", { p_limit: limit });
    if (error !== null) throw collaborationError(error);
    return rows(data).map(auditFromRow);
  }

  async redeemInvite(code: string): Promise<SharedLearnerAccess> {
    const { data, error } = await this.client.rpc("redeem_collaboration_invite", { p_code: code.trim() });
    if (error !== null) throw collaborationError(error);
    return sharedAccessFromRow(firstRow(data));
  }

  async listSharedLearners(): Promise<readonly SharedLearnerAccess[]> {
    const { data, error } = await this.client.rpc("list_my_shared_learner_spaces");
    if (error !== null) throw collaborationError(error);
    return rows(data).map(sharedAccessFromRow);
  }

  async getSharedProgress(grantId: string, selectedExamId: PracticeExamId): Promise<SharedProgress> {
    const { data, error } = await this.client.rpc("get_shared_learning_progress", {
      p_grant_id: grantId,
      p_exam_id: selectedExamId,
    });
    if (error !== null) throw collaborationError(error);
    return { grantId, examId: selectedExamId, sessions: rows(data).map(progressFromRow) };
  }

  async listSharedResponses(grantId: string, selectedExamId: PracticeExamId): Promise<readonly SharedResponseSession[]> {
    const { data, error } = await this.client.rpc("list_shared_learning_responses", {
      p_grant_id: grantId,
      p_exam_id: selectedExamId,
    });
    if (error !== null) throw collaborationError(error);
    return rows(data).map(responseFromRow);
  }

  async listArtifacts(grantId: string): Promise<readonly CollaborationArtifact[]> {
    const { data, error } = await this.client.rpc("list_collaboration_artifacts", { p_grant_id: grantId });
    if (error !== null) throw collaborationError(error);
    return rows(data).map(artifactFromRow);
  }

  async createArtifact(input: CreateCollaborationArtifactInput): Promise<CollaborationArtifact> {
    const { data, error } = await this.client.rpc("create_collaboration_artifact", {
      p_grant_id: input.grantId,
      p_kind: input.kind,
      p_exam_id: input.examId,
      p_title: input.title.trim(),
      p_body: input.body.trim(),
      p_due_at: input.dueAt ?? null,
    });
    if (error !== null) throw collaborationError(error);
    return artifactFromRow(firstRow(data));
  }
}
