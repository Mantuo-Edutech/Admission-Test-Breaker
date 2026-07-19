import {
  AuthSessionMissingError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabaseLearnerDataRepository } from "../../../src/features/learner-data/supabase-repository.js";

function client(getUser: () => Promise<unknown>): SupabaseClient {
  return { auth: { getUser } } as unknown as SupabaseClient;
}

describe("Supabase learner context", () => {
  it("treats an absent auth session as an anonymous learner instead of a storage outage", async () => {
    const repository = new SupabaseLearnerDataRepository(client(async () => ({
      data: { user: null },
      error: new AuthSessionMissingError(),
    })));

    await expect(repository.currentContext()).resolves.toBeNull();
  });

  it("keeps a real identity-service failure distinct from anonymous use", async () => {
    const repository = new SupabaseLearnerDataRepository(client(async () => ({
      data: { user: null },
      error: new Error("network unavailable"),
    })));

    await expect(repository.currentContext()).rejects.toThrow("无法确认登录状态");
  });
});
