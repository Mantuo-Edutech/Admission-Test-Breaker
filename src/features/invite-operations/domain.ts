export interface InviteOperatorContext {
  readonly active: boolean;
  readonly displayName: string | null;
  readonly permissions: readonly string[];
}

export interface InvitePackage {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly publishedResourceCount: number;
  readonly publishedResourceTitles: readonly string[];
}

export interface IssueInviteInput {
  readonly reference: string;
  readonly packageIds: readonly string[];
  readonly maxRedemptions: number;
  readonly expiresAt: string;
  readonly entitlementDays: number;
}

export interface IssuedInvite {
  readonly id: string;
  readonly code: string;
  readonly expiresAt: string;
}

export interface ManagedInvite {
  readonly id: string;
  readonly reference: string;
  readonly status: string;
  readonly packageIds: readonly string[];
  readonly maxRedemptions: number;
  readonly redemptionCount: number;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly entitlementDuration: string;
  readonly revokedAt: string | null;
  readonly revokeReason: string | null;
}

export interface InviteOperatorActivity {
  readonly eventType: "operator_granted" | "operator_revoked" | "invite_issued" | "invite_revoked";
  readonly inviteId: string | null;
  readonly occurredAt: string;
}

export interface InviteOperationsService {
  readonly configured: true;
  getContext(): Promise<InviteOperatorContext>;
  listPackages(): Promise<readonly InvitePackage[]>;
  issueInvite(input: IssueInviteInput): Promise<IssuedInvite>;
  listMine(): Promise<readonly ManagedInvite[]>;
  revokeMine(inviteId: string, reason: string): Promise<void>;
  listActivity(limit?: number): Promise<readonly InviteOperatorActivity[]>;
}

export type ManagedInviteDisplayStatus = "available" | "exhausted" | "expired" | "revoked";

export interface InviteIssueValidation {
  readonly reference?: string;
  readonly packageIds?: string;
  readonly maxRedemptions?: string;
  readonly expiresAt?: string;
  readonly entitlementDays?: string;
}

const obviousContactDetails = /@|https?:\/\/|(?:\D|^)(?:\d\D*){8,}/iu;

export function validateInviteIssue(
  input: IssueInviteInput,
  now: Date,
): InviteIssueValidation {
  const errors: {
    reference?: string;
    packageIds?: string;
    maxRedemptions?: string;
    expiresAt?: string;
    entitlementDays?: string;
  } = {};
  const reference = input.reference.trim();
  if (reference.length < 2 || reference.length > 80) {
    errors.reference = "内部参考需要 2–80 个字符";
  } else if (obviousContactDetails.test(reference)) {
    errors.reference = "内部参考不能包含邮箱、网址或手机号";
  }
  if (input.packageIds.length === 0) {
    errors.packageIds = "请至少选择一个已发布资料包";
  }
  if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1 || input.maxRedemptions > 20) {
    errors.maxRedemptions = "可核销次数必须为 1–20 次";
  }
  const expiryTime = Date.parse(input.expiresAt);
  const minimumExpiry = now.getTime() + 5 * 60 * 1000;
  const maximumExpiry = now.getTime() + 90 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(expiryTime) || expiryTime <= minimumExpiry || expiryTime > maximumExpiry) {
    errors.expiresAt = "邀请码有效期必须在 5 分钟至 90 天之间";
  }
  if (!Number.isInteger(input.entitlementDays) || input.entitlementDays < 1 || input.entitlementDays > 365) {
    errors.entitlementDays = "资料权限必须在 1–365 天之间";
  }
  return errors;
}

export function hasInviteIssueErrors(value: InviteIssueValidation): boolean {
  return Object.keys(value).length > 0;
}

export function managedInviteDisplayStatus(
  invite: ManagedInvite,
  now: Date,
): ManagedInviteDisplayStatus {
  if (invite.status === "revoked" || invite.revokedAt !== null) return "revoked";
  if (invite.redemptionCount >= invite.maxRedemptions) return "exhausted";
  if (Date.parse(invite.expiresAt) <= now.getTime()) return "expired";
  return "available";
}
