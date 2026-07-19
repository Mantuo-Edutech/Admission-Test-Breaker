import type { PracticeExamId } from "../practice/catalog/assessment-registry.js";

export const collaborationSubjectKinds = ["teacher", "parent"] as const;
export type CollaborationSubjectKind = (typeof collaborationSubjectKinds)[number];

export const collaborationScopes = [
  "progress:read",
  "responses:read",
  "annotations:write",
  "plans:write",
  "assignments:write",
] as const;
export type CollaborationScope = (typeof collaborationScopes)[number];

export const collaborationExamIds = ["tmua", "esat", "tara", "lnat", "ucat"] as const;

export const collaborationArtifactKinds = ["annotation", "plan", "assignment"] as const;
export type CollaborationArtifactKind = (typeof collaborationArtifactKinds)[number];

export interface IssueCollaborationInviteInput {
  readonly subjectKind: CollaborationSubjectKind;
  readonly scopes: readonly CollaborationScope[];
  readonly examIds: readonly PracticeExamId[];
  readonly grantDays: number;
}

export interface IssuedCollaborationInvite {
  readonly id: string;
  readonly code: string;
  readonly inviteExpiresAt: string;
}

export interface CollaborationInviteSummary {
  readonly id: string;
  readonly subjectKind: CollaborationSubjectKind;
  readonly scopes: readonly CollaborationScope[];
  readonly examIds: readonly PracticeExamId[];
  readonly status: "pending" | "redeemed" | "revoked" | "expired";
  readonly createdAt: string;
  readonly inviteExpiresAt: string;
  readonly redeemedAt: string | null;
}

export interface CollaborationGrantSummary {
  readonly id: string;
  readonly subjectKind: CollaborationSubjectKind;
  readonly subjectReference: string;
  readonly scopes: readonly CollaborationScope[];
  readonly examIds: readonly PracticeExamId[];
  readonly startsAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly status: "active" | "expired" | "revoked";
}

export interface SharedLearnerAccess {
  readonly grantId: string;
  readonly learnerReference: string;
  readonly subjectKind: CollaborationSubjectKind;
  readonly scopes: readonly CollaborationScope[];
  readonly examIds: readonly PracticeExamId[];
  readonly expiresAt: string;
}

export interface SharedProgressSession {
  readonly sessionId: string;
  readonly paperId: string;
  readonly status: "active" | "submitted" | "expired";
  readonly startedAt: string;
  readonly submittedAt: string | null;
  readonly answeredCount: number;
  readonly activeMs: number;
  readonly answerChanges: number;
  readonly lastActivityAt: string;
}

export interface SharedProgress {
  readonly grantId: string;
  readonly examId: PracticeExamId;
  readonly sessions: readonly SharedProgressSession[];
}

export interface SharedResponseSession {
  readonly sessionId: string;
  readonly paperId: string;
  readonly status: "active" | "submitted" | "expired";
  readonly startedAt: string;
  readonly submittedAt: string | null;
  readonly answers: Readonly<Record<string, string>>;
  readonly timingByQuestionMs: Readonly<Record<string, number>>;
}

export interface CollaborationArtifact {
  readonly id: string;
  readonly grantId: string;
  readonly kind: CollaborationArtifactKind;
  readonly examId: PracticeExamId;
  readonly title: string;
  readonly body: string;
  readonly dueAt: string | null;
  readonly authorReference: string;
  readonly createdAt: string;
}

export interface CreateCollaborationArtifactInput {
  readonly grantId: string;
  readonly kind: CollaborationArtifactKind;
  readonly examId: PracticeExamId;
  readonly title: string;
  readonly body: string;
  readonly dueAt?: string;
}

export type CollaborationAuditEventType =
  | "invite_created"
  | "invite_revoked"
  | "grant_redeemed"
  | "grant_revoked"
  | "progress_viewed"
  | "responses_viewed"
  | "annotation_created"
  | "plan_created"
  | "assignment_created";

export interface CollaborationAuditEvent {
  readonly eventType: CollaborationAuditEventType;
  readonly grantId: string | null;
  readonly actorReference: string;
  readonly examId: PracticeExamId | null;
  readonly occurredAt: string;
}

export interface CollaborationService {
  readonly configured: true;
  issueInvite(input: IssueCollaborationInviteInput): Promise<IssuedCollaborationInvite>;
  listMyInvites(): Promise<readonly CollaborationInviteSummary[]>;
  cancelMyInvite(inviteId: string): Promise<void>;
  listMyGrants(): Promise<readonly CollaborationGrantSummary[]>;
  revokeMyGrant(grantId: string): Promise<void>;
  listMyAudit(limit?: number): Promise<readonly CollaborationAuditEvent[]>;
  redeemInvite(code: string): Promise<SharedLearnerAccess>;
  listSharedLearners(): Promise<readonly SharedLearnerAccess[]>;
  getSharedProgress(grantId: string, examId: PracticeExamId): Promise<SharedProgress>;
  listSharedResponses(grantId: string, examId: PracticeExamId): Promise<readonly SharedResponseSession[]>;
  listArtifacts(grantId: string): Promise<readonly CollaborationArtifact[]>;
  createArtifact(input: CreateCollaborationArtifactInput): Promise<CollaborationArtifact>;
}

export interface CollaborationInviteValidation {
  readonly subjectKind?: string;
  readonly scopes?: string;
  readonly examIds?: string;
  readonly grantDays?: string;
}

export function validateCollaborationInvite(
  input: IssueCollaborationInviteInput,
): CollaborationInviteValidation {
  const errors: { subjectKind?: string; scopes?: string; examIds?: string; grantDays?: string } = {};
  if (!collaborationSubjectKinds.includes(input.subjectKind)) {
    errors.subjectKind = "请选择老师或家长";
  }
  if (input.scopes.length === 0 || input.scopes.some((scope) => !collaborationScopes.includes(scope))) {
    errors.scopes = "请至少选择一项明确权限";
  }
  if (input.examIds.length === 0 || input.examIds.some((examId) => !collaborationExamIds.includes(examId))) {
    errors.examIds = "请至少选择一项考试";
  }
  if (!Number.isInteger(input.grantDays) || input.grantDays < 1 || input.grantDays > 180) {
    errors.grantDays = "授权有效期必须为 1–180 天";
  }
  return errors;
}

export function hasCollaborationInviteErrors(value: CollaborationInviteValidation): boolean {
  return Object.keys(value).length > 0;
}

export function scopeForArtifact(kind: CollaborationArtifactKind): CollaborationScope {
  if (kind === "annotation") return "annotations:write";
  if (kind === "plan") return "plans:write";
  return "assignments:write";
}
