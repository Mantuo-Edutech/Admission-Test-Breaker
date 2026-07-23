import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  clearLocalLearnerData,
  parseLearningDataExport,
  SupabaseDataRightsService,
} from "../../../src/features/data-rights/supabase-data-rights-service.js";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function exportPayload() {
  return {
    schemaVersion: 4 as const,
    exportedAt: "2026-07-18T08:00:00.000Z",
    account: {
      email: "student@example.com",
      platformUserId: "usr_student",
      learnerSpaceId: "lsp_student",
    },
    preparationProfile: null,
    practiceSessions: [],
    contentEntitlements: [],
    feedback: [],
    assessmentBackgroundProfiles: [],
    collaborationInvites: [],
    collaborationGrants: [],
    collaborationArtifacts: [],
    collaborationAudit: [],
  };
}

describe("student data rights service", () => {
  it("rejects incomplete export payloads instead of downloading unverified data", () => {
    expect(() => parseLearningDataExport({ schemaVersion: 1 })).toThrow(
      "缺少账号信息",
    );
    expect(parseLearningDataExport(exportPayload())).toEqual(exportPayload());
    expect(() => parseLearningDataExport({ ...exportPayload(), schemaVersion: 2, feedback: undefined })).toThrow(
      "缺少反馈记录",
    );
    expect(parseLearningDataExport({
      ...exportPayload(),
      schemaVersion: 2,
      assessmentBackgroundProfiles: undefined,
    })).toMatchObject({
      schemaVersion: 2,
      feedback: [],
    });
    expect(() => parseLearningDataExport({
      ...exportPayload(),
      schemaVersion: 3,
      assessmentBackgroundProfiles: undefined,
    })).toThrow("缺少考试背景档案");
    expect(() => parseLearningDataExport({
      ...exportPayload(),
      collaborationAudit: undefined,
    })).toThrow("缺少协作授权记录");
  });

  it("clears only known learner-data keys from browser storage", () => {
    const storage = new MemoryStorage();
    storage.setItem("admission-breaker:guest-space:v1", "private");
    storage.setItem("admission-test-breaker.esat-plan.v1", "private");
    storage.setItem("mantuo.product-funnel-events.v1", "anonymous-counts");
    storage.setItem("unrelated-preference", "keep");

    clearLocalLearnerData(storage);

    expect(storage.getItem("admission-breaker:guest-space:v1")).toBeNull();
    expect(storage.getItem("admission-test-breaker.esat-plan.v1")).toBeNull();
    expect(storage.getItem("mantuo.product-funnel-events.v1")).toBeNull();
    expect(storage.getItem("unrelated-preference")).toBe("keep");
  });

  it("re-verifies the current password before deleting and clears local learner data", async () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    local.setItem("admission-breaker:practice:current:v1", "private");
    session.setItem("admission-test-breaker.pending-invite.v1", "private");
    const rpc = vi.fn(async (name: string) => ({
      data: name === "export_my_learning_data" ? exportPayload() : null,
      error: null,
    }));
    const signOut = vi.fn(async () => ({ error: null }));
    const client = {
      rpc,
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { email: "student@example.com" } },
          error: null,
        })),
        signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
        signOut,
      },
    } as unknown as SupabaseClient;
    const service = new SupabaseDataRightsService(client, local, session);

    await expect(service.exportMyLearningData()).resolves.toEqual(exportPayload());
    await service.deleteMyAccount("SecurePass1");

    expect(rpc).toHaveBeenCalledWith("delete_my_account");
    expect(local.length).toBe(0);
    expect(session.length).toBe(0);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
