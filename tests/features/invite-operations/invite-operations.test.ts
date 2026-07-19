import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  managedInviteDisplayStatus,
  validateInviteIssue,
  type ManagedInvite,
} from "../../../src/features/invite-operations/domain.js";
import { SupabaseInviteOperationsService } from "../../../src/features/invite-operations/supabase-invite-operations-service.js";

const NOW = new Date("2026-07-19T00:00:00.000Z");

function managedInvite(overrides: Partial<ManagedInvite> = {}): ManagedInvite {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    reference: "TMUA cohort 01",
    status: "active",
    packageIds: ["tmua-full-access"],
    maxRedemptions: 1,
    redemptionCount: 0,
    createdAt: "2026-07-18T00:00:00.000Z",
    expiresAt: "2026-07-26T00:00:00.000Z",
    entitlementDuration: "30 days",
    revokedAt: null,
    revokeReason: null,
    ...overrides,
  };
}

describe("invite operations domain", () => {
  it("rejects personal contact details and unsafe issuance limits before the RPC", () => {
    expect(validateInviteIssue({
      reference: "student@example.com 13800138000",
      packageIds: [],
      maxRedemptions: 21,
      expiresAt: "2027-01-01T00:00:00.000Z",
      entitlementDays: 366,
    }, NOW)).toEqual({
      reference: "内部参考不能包含邮箱、网址或手机号",
      packageIds: "请至少选择一个已发布资料包",
      maxRedemptions: "可核销次数必须为 1–20 次",
      expiresAt: "邀请码有效期必须在 5 分钟至 90 天之间",
      entitlementDays: "资料权限必须在 1–365 天之间",
    });
  });

  it("derives an honest status from revocation, redemption and expiry evidence", () => {
    expect(managedInviteDisplayStatus(managedInvite(), NOW)).toBe("available");
    expect(managedInviteDisplayStatus(managedInvite({ redemptionCount: 1 }), NOW)).toBe("exhausted");
    expect(managedInviteDisplayStatus(managedInvite({ expiresAt: "2026-07-18T00:00:00.000Z" }), NOW)).toBe("expired");
    expect(managedInviteDisplayStatus(managedInvite({ status: "revoked" }), NOW)).toBe("revoked");
  });
});

describe("Supabase invite operations service", () => {
  it("uses only the constrained operator RPCs and parses non-identifying records", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "get_my_invite_operator_context") {
        return { data: [{ active: true, display_name: "冰冰", permissions: ["issue_invite"] }], error: null };
      }
      if (name === "list_invite_operator_packages") {
        return { data: [{ package_id: "tmua-full-access", name: "TMUA Full Access", description: "Two resources", published_resource_count: 2, published_resource_titles: ["Plan", "Review"] }], error: null };
      }
      if (name === "issue_operator_invite") {
        return { data: [{ invite_id: "11111111-1111-4111-8111-111111111111", code: "A".repeat(36), expires_at: "2026-07-26T00:00:00.000Z" }], error: null };
      }
      if (name === "list_my_issued_invites") {
        return { data: [{ invite_id: "11111111-1111-4111-8111-111111111111", reference: "TMUA cohort 01", status: "active", package_ids: ["tmua-full-access"], max_redemptions: 1, redemption_count: 0, created_at: "2026-07-19T00:00:00.000Z", expires_at: "2026-07-26T00:00:00.000Z", entitlement_duration: "30 days", revoked_at: null, revoke_reason: null }], error: null };
      }
      if (name === "list_my_invite_operator_activity") {
        return { data: [{ event_type: "invite_issued", invite_id: "11111111-1111-4111-8111-111111111111", occurred_at: "2026-07-19T00:00:00.000Z", details: {} }], error: null };
      }
      return { data: [{ invite_id: "11111111-1111-4111-8111-111111111111", status: "revoked", revoked_at: "2026-07-19T01:00:00.000Z" }], error: null };
    });
    const service = new SupabaseInviteOperationsService({ rpc } as unknown as SupabaseClient);

    await expect(service.getContext()).resolves.toMatchObject({ active: true, displayName: "冰冰" });
    await expect(service.listPackages()).resolves.toMatchObject([{ id: "tmua-full-access", publishedResourceCount: 2 }]);
    await expect(service.issueInvite({ reference: "TMUA cohort 01", packageIds: ["tmua-full-access"], maxRedemptions: 1, expiresAt: "2026-07-26T00:00:00.000Z", entitlementDays: 30 })).resolves.toMatchObject({ code: "A".repeat(36) });
    await expect(service.listMine()).resolves.toMatchObject([{ reference: "TMUA cohort 01", redemptionCount: 0 }]);
    await expect(service.listActivity()).resolves.toMatchObject([{ eventType: "invite_issued" }]);
    await expect(service.revokeMine("11111111-1111-4111-8111-111111111111", "Consultation ended")).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledWith("issue_operator_invite", {
      p_reference: "TMUA cohort 01",
      p_package_ids: ["tmua-full-access"],
      p_max_redemptions: 1,
      p_expires_at: "2026-07-26T00:00:00.000Z",
      p_entitlement_duration: "30 days",
    });
    expect(rpc).toHaveBeenCalledWith("revoke_my_issued_invite", {
      p_invite_id: "11111111-1111-4111-8111-111111111111",
      p_reason: "Consultation ended",
    });
  });

  it("maps operator denial without exposing database details", async () => {
    const service = new SupabaseInviteOperationsService({
      rpc: vi.fn(async () => ({ data: null, error: { message: "invite_operator_required", code: "42501" } })),
    } as unknown as SupabaseClient);

    await expect(service.listMine()).rejects.toThrow("当前账号没有邀请码运营权限");
  });
});
