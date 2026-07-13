import { describe, expect, it } from "vitest";
import { createPreparationProfile } from "../../../../src/features/preparation-profile/domain.js";
import { LocalPreparationProfileStore } from "../../../../src/features/preparation-profile/storage/local-store.js";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  keys(): string[] {
    return [...this.values.keys()];
  }
}

function profile(guestSpaceId = "gsp_profile-one") {
  return createPreparationProfile({
    guestSpaceId,
    exam: "TMUA",
    entryCycle: "2027",
    curriculumSystem: "caie",
    selections: [
      { qualificationId: "caie-9709-2026-2027", unitIds: ["p1", "s1"] },
    ],
    experience: "sampled",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  });
}

describe("local preparation profile store", () => {
  it("round-trips one profile inside its Guest Space", async () => {
    const storage = new MemoryStorage();
    const store = new LocalPreparationProfileStore(storage);
    const value = profile();

    await expect(store.save(value)).resolves.toEqual({ persisted: true });
    await expect(store.load(value.guestSpaceId)).resolves.toEqual({
      profile: value,
      issue: null,
    });
    await expect(store.load("gsp_other")).resolves.toEqual({
      profile: null,
      issue: null,
    });
  });

  it("rejects a profile stored under another Guest Space key", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "admission-breaker:preparation-profile:gsp_intruder:v1",
      JSON.stringify(profile("gsp_profile-one")),
    );
    const store = new LocalPreparationProfileStore(
      storage,
      () => new Date("2026-07-14T01:00:00.000Z"),
    );

    await expect(store.load("gsp_intruder")).resolves.toEqual({
      profile: null,
      issue: "corrupt",
    });
    expect(
      storage.keys().some((key) => key.includes("gsp_intruder:corrupt:")),
    ).toBe(true);
  });

  it("classifies unknown schema versions separately and quarantines them", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "admission-breaker:preparation-profile:gsp_profile-one:v1",
      JSON.stringify({ schemaVersion: 2 }),
    );
    const store = new LocalPreparationProfileStore(storage);

    await expect(store.load("gsp_profile-one")).resolves.toEqual({
      profile: null,
      issue: "unsupported",
    });
  });

  it("clears only the requested Guest Space profile", async () => {
    const storage = new MemoryStorage();
    const store = new LocalPreparationProfileStore(storage);
    await store.save(profile("gsp_profile-one"));
    await store.save(profile("gsp_profile-two"));

    await store.clear("gsp_profile-one");

    expect((await store.load("gsp_profile-one")).profile).toBeNull();
    expect((await store.load("gsp_profile-two")).profile?.guestSpaceId).toBe(
      "gsp_profile-two",
    );
  });
});
