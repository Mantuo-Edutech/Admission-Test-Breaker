import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InviteOperationsService,
  InviteOperatorActivity,
  InviteOperatorContext,
  InvitePackage,
  IssuedInvite,
  IssueInviteInput,
  ManagedInvite,
} from "./domain.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function firstRow(value: unknown): Record<string, unknown> {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!isRecord(candidate)) throw new Error("邀请码运营数据格式无法验证");
  return candidate;
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("邀请码运营数据格式无法验证");
  }
  return value;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("邀请码运营数据格式无法验证");
  }
  return value;
}

function requiredNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error("邀请码运营数据格式无法验证");
  return parsed;
}

function operationsError(error: { message?: string; code?: string }): Error {
  const message = error.message ?? "";
  if (message.includes("invite_operator_required") || error.code === "42501") {
    return new Error("当前账号没有邀请码运营权限");
  }
  if (message.includes("invite_reference_personal_data")) {
    return new Error("内部参考不能包含邮箱、网址或手机号");
  }
  if (message.includes("invite_reference_invalid")) {
    return new Error("内部参考需要 2–80 个字符");
  }
  if (message.includes("invite_package_unpublished") || message.includes("invite_package_invalid")) {
    return new Error("所选资料包当前不能签发，请刷新后重试");
  }
  if (message.includes("invite_operator_expiry_invalid")) {
    return new Error("邀请码有效期必须在 5 分钟至 90 天之间");
  }
  if (message.includes("invite_operator_duration_invalid")) {
    return new Error("资料权限必须在 1–365 天之间");
  }
  if (message.includes("invite_not_found")) {
    return new Error("邀请码不存在、已经撤销或不属于当前运营账号");
  }
  if (message.includes("invite_revoke_reason")) {
    return new Error("撤销原因需要 3–240 个字符，且不能包含联系方式");
  }
  return new Error("邀请码运营服务暂时不可用，请稍后再试");
}

function contextFromRow(value: unknown): InviteOperatorContext {
  const row = firstRow(value);
  if (typeof row.active !== "boolean") throw new Error("邀请码运营数据格式无法验证");
  return {
    active: row.active,
    displayName: typeof row.display_name === "string" ? row.display_name : null,
    permissions: stringArray(row.permissions ?? []),
  };
}

function packageFromRow(value: unknown): InvitePackage {
  if (!isRecord(value)) throw new Error("邀请码运营数据格式无法验证");
  return {
    id: requiredString(value.package_id),
    name: requiredString(value.name),
    description: typeof value.description === "string" ? value.description : "",
    publishedResourceCount: requiredNumber(value.published_resource_count),
    publishedResourceTitles: stringArray(value.published_resource_titles),
  };
}

function managedInviteFromRow(value: unknown): ManagedInvite {
  if (!isRecord(value)) throw new Error("邀请码运营数据格式无法验证");
  return {
    id: requiredString(value.invite_id),
    reference: requiredString(value.reference),
    status: requiredString(value.status),
    packageIds: stringArray(value.package_ids),
    maxRedemptions: requiredNumber(value.max_redemptions),
    redemptionCount: requiredNumber(value.redemption_count),
    createdAt: requiredString(value.created_at),
    expiresAt: requiredString(value.expires_at),
    entitlementDuration: typeof value.entitlement_duration === "string"
      ? value.entitlement_duration
      : "—",
    revokedAt: typeof value.revoked_at === "string" ? value.revoked_at : null,
    revokeReason: typeof value.revoke_reason === "string" ? value.revoke_reason : null,
  };
}

function activityFromRow(value: unknown): InviteOperatorActivity {
  if (!isRecord(value)) throw new Error("邀请码运营数据格式无法验证");
  const eventType = value.event_type;
  if (
    eventType !== "operator_granted"
    && eventType !== "operator_revoked"
    && eventType !== "invite_issued"
    && eventType !== "invite_revoked"
  ) {
    throw new Error("邀请码运营数据格式无法验证");
  }
  return {
    eventType,
    inviteId: typeof value.invite_id === "string" ? value.invite_id : null,
    occurredAt: requiredString(value.occurred_at),
  };
}

export class SupabaseInviteOperationsService implements InviteOperationsService {
  readonly configured = true as const;

  constructor(private readonly client: SupabaseClient) {}

  async getContext(): Promise<InviteOperatorContext> {
    const { data, error } = await this.client.rpc("get_my_invite_operator_context");
    if (error !== null) throw operationsError(error);
    return contextFromRow(data);
  }

  async listPackages(): Promise<readonly InvitePackage[]> {
    const { data, error } = await this.client.rpc("list_invite_operator_packages");
    if (error !== null) throw operationsError(error);
    if (!Array.isArray(data)) throw new Error("邀请码运营数据格式无法验证");
    return data.map(packageFromRow);
  }

  async issueInvite(input: IssueInviteInput): Promise<IssuedInvite> {
    const { data, error } = await this.client.rpc("issue_operator_invite", {
      p_reference: input.reference.trim(),
      p_package_ids: [...input.packageIds],
      p_max_redemptions: input.maxRedemptions,
      p_expires_at: input.expiresAt,
      p_entitlement_duration: `${input.entitlementDays} days`,
    });
    if (error !== null) throw operationsError(error);
    const row = firstRow(data);
    return {
      id: requiredString(row.invite_id),
      code: requiredString(row.code),
      expiresAt: requiredString(row.expires_at),
    };
  }

  async listMine(): Promise<readonly ManagedInvite[]> {
    const { data, error } = await this.client.rpc("list_my_issued_invites");
    if (error !== null) throw operationsError(error);
    if (!Array.isArray(data)) throw new Error("邀请码运营数据格式无法验证");
    return data.map(managedInviteFromRow);
  }

  async revokeMine(inviteId: string, reason: string): Promise<void> {
    const { error } = await this.client.rpc("revoke_my_issued_invite", {
      p_invite_id: inviteId,
      p_reason: reason.trim(),
    });
    if (error !== null) throw operationsError(error);
  }

  async listActivity(limit = 20): Promise<readonly InviteOperatorActivity[]> {
    const { data, error } = await this.client.rpc("list_my_invite_operator_activity", {
      p_limit: limit,
    });
    if (error !== null) throw operationsError(error);
    if (!Array.isArray(data)) throw new Error("邀请码运营数据格式无法验证");
    return data.map(activityFromRow);
  }
}
