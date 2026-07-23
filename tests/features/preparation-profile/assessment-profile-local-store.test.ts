import { describe, expect, it } from "vitest";
import { createAssessmentBackgroundProfile } from "../../../src/features/preparation-profile/assessment-profile-domain.js";
import { LocalAssessmentProfileStore } from "../../../src/features/preparation-profile/storage/assessment-profile-local-store.js";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
  keys() { return [...this.values.keys()]; }
}

function profile(examId: "tara" | "lnat" | "ucat" = "ucat", guestSpaceId = "gsp_assessment-store") {
  return createAssessmentBackgroundProfile({
    guestSpaceId,
    examId,
    entryCycle: "2027",
    curriculumId: "ib",
    learningStage: "year-12",
    subjectAreas: ["biology"],
    experience: "sampled",
    weeklyTime: "2-4",
    createdAt: "2026-07-18T12:00:00.000Z",
    updatedAt: "2026-07-18T12:00:00.000Z",
  });
}

describe("local assessment background profile store", () => {
  it("keeps separate profiles per exam and guest learning space", async () => {
    const store = new LocalAssessmentProfileStore(new MemoryStorage());
    await store.save(profile("ucat"));
    await store.save(profile("lnat"));
    await store.save(profile("ucat", "gsp_assessment-other"));

    await expect(store.load("gsp_assessment-store", "ucat")).resolves.toMatchObject({
      profile: { examId: "ucat", guestSpaceId: "gsp_assessment-store" },
      issue: null,
    });
    await expect(store.load("gsp_assessment-store", "lnat")).resolves.toMatchObject({
      profile: { examId: "lnat" },
      issue: null,
    });
    await expect(store.load("gsp_assessment-other", "lnat")).resolves.toEqual({ profile: null, issue: null });
  });

  it("migrates a version 1 broad-subject profile to exact version 2 courses", async () => {
    const storage = new MemoryStorage();
    const legacyKey = "admission-breaker:assessment-profile:gsp_assessment-store:tara:v1";
    storage.setItem(legacyKey, JSON.stringify({
      schemaVersion: 1,
      guestSpaceId: "gsp_assessment-store",
      examId: "tara",
      entryCycle: "2027",
      curriculumId: "ib",
      learningStage: "year-12",
      subjectAreas: ["further-mathematics", "english-language"],
      experience: "sampled",
      weeklyTime: "2-4",
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
    }));
    const store = new LocalAssessmentProfileStore(storage);

    await expect(store.load("gsp_assessment-store", "tara")).resolves.toMatchObject({
      profile: {
        schemaVersion: 2,
        courseIds: ["ib-math-aa-hl", "ib-english-a-language-literature"],
      },
      issue: null,
    });
    expect(storage.getItem(legacyKey)).toBeNull();
    expect(storage.getItem("admission-breaker:assessment-profile:gsp_assessment-store:tara:v2")).not.toBeNull();
  });

  it("quarantines a profile that crosses its exam boundary", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "admission-breaker:assessment-profile:gsp_assessment-store:lnat:v1",
      JSON.stringify(profile("ucat")),
    );
    const store = new LocalAssessmentProfileStore(storage, () => new Date("2026-07-18T13:00:00.000Z"));

    await expect(store.load("gsp_assessment-store", "lnat")).resolves.toEqual({ profile: null, issue: "corrupt" });
    expect(storage.keys().some((key) => key.includes(":lnat:corrupt:"))).toBe(true);
  });

  it("classifies unknown versions and clears only the selected exam", async () => {
    const storage = new MemoryStorage();
    const store = new LocalAssessmentProfileStore(storage);
    await store.save(profile("ucat"));
    await store.save(profile("tara"));
    storage.setItem(
      "admission-breaker:assessment-profile:gsp_assessment-store:lnat:v1",
      JSON.stringify({ schemaVersion: 3 }),
    );

    await expect(store.load("gsp_assessment-store", "lnat")).resolves.toEqual({ profile: null, issue: "unsupported" });
    await store.clear("gsp_assessment-store", "tara");
    expect((await store.load("gsp_assessment-store", "tara")).profile).toBeNull();
    expect((await store.load("gsp_assessment-store", "ucat")).profile?.examId).toBe("ucat");
  });
});
