import {
  AuthSessionMissingError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createAssessmentBackgroundProfile } from "../../../src/features/preparation-profile/assessment-profile-domain.js";
import { LocalAssessmentProfileStore } from "../../../src/features/preparation-profile/storage/assessment-profile-local-store.js";
import { SupabaseAssessmentProfileStore } from "../../../src/features/preparation-profile/storage/supabase-assessment-profile-store.js";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function profile() {
  return createAssessmentBackgroundProfile({
    guestSpaceId: "gsp_assessment-supabase-store",
    examId: "ucat",
    entryCycle: "2027",
    curriculumId: "a-level",
    learningStage: "year-12",
    subjectAreas: ["mathematics"],
    experience: "sampled",
    weeklyTime: "2-4",
    createdAt: "2026-07-18T12:00:00.000Z",
    updatedAt: "2026-07-18T12:00:00.000Z",
  });
}

function clientWithGetUser(getUser: () => Promise<unknown>): SupabaseClient {
  return {
    auth: { getUser },
  } as unknown as SupabaseClient;
}

describe("Supabase assessment profile fallback", () => {
  it("treats a missing auth session as an anonymous student and persists locally", async () => {
    const local = new LocalAssessmentProfileStore(new MemoryStorage());
    const store = new SupabaseAssessmentProfileStore(local, clientWithGetUser(async () => ({
      data: { user: null },
      error: new AuthSessionMissingError(),
    })));

    await expect(store.save(profile())).resolves.toEqual({ persisted: true });
    await expect(store.load("gsp_assessment-supabase-store", "ucat")).resolves.toMatchObject({
      profile: { examId: "ucat", subjectAreas: ["mathematics"] },
      issue: null,
    });
  });

  it("keeps a transient profile available across in-app navigation when auth is unavailable", async () => {
    const local = new LocalAssessmentProfileStore(new MemoryStorage());
    const store = new SupabaseAssessmentProfileStore(local, clientWithGetUser(async () => {
      throw new Error("auth network unavailable");
    }));

    await expect(store.save(profile())).resolves.toEqual({
      persisted: false,
      durable: false,
      issue: "unavailable",
    });
    await expect(store.load("gsp_assessment-supabase-store", "ucat")).resolves.toMatchObject({
      profile: { examId: "ucat", subjectAreas: ["mathematics"] },
      issue: "unavailable",
    });
  });
});
