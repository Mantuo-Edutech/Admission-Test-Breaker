import { describe, expect, it } from "vitest";
import {
  GUEST_SPACE_STORAGE_KEY,
  LocalGuestSpaceStore,
} from "../../../../src/features/guest-space/storage/local-store.js";

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

describe("local guest space store", () => {
  it("returns one stable guest space across repeated loads and store instances", async () => {
    const storage = new MemoryStorage();
    const firstStore = new LocalGuestSpaceStore(
      storage,
      () => new Date("2026-07-14T00:00:00.000Z"),
      () => "browser-one",
    );

    const first = await firstStore.loadOrCreate();
    const repeated = await firstStore.loadOrCreate();
    const reloaded = await new LocalGuestSpaceStore(
      storage,
      () => new Date("2026-07-14T01:00:00.000Z"),
      () => "must-not-be-used",
    ).loadOrCreate();

    expect(first).toEqual({
      id: "gsp_browser-one",
      ownerActorId: "guest_browser-one",
      status: "unclaimed",
      createdAt: "2026-07-14T00:00:00.000Z",
    });
    expect(repeated).toEqual(first);
    expect(reloaded).toEqual(first);
  });

  it("quarantines malformed guest data before creating a replacement", async () => {
    const storage = new MemoryStorage();
    storage.setItem(GUEST_SPACE_STORAGE_KEY, "{bad json");
    const store = new LocalGuestSpaceStore(
      storage,
      () => new Date("2026-07-14T00:00:00.000Z"),
      () => "replacement",
    );

    expect((await store.loadOrCreate()).id).toBe("gsp_replacement");
    expect(
      storage.keys().some((key) =>
        key.startsWith("admission-breaker:guest-space:corrupt:"),
      ),
    ).toBe(true);
    expect(JSON.parse(storage.getItem(GUEST_SPACE_STORAGE_KEY) ?? "null")).toMatchObject({
      id: "gsp_replacement",
    });
  });

  it("rejects unsupported fields and statuses instead of silently widening the contract", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      GUEST_SPACE_STORAGE_KEY,
      JSON.stringify({
        id: "gsp_untrusted",
        ownerActorId: "guest_untrusted",
        status: "claimed",
        createdAt: "2026-07-14T00:00:00.000Z",
        uploaded: true,
      }),
    );
    const store = new LocalGuestSpaceStore(
      storage,
      () => new Date("2026-07-14T01:00:00.000Z"),
      () => "strict-replacement",
    );

    expect(await store.loadOrCreate()).toMatchObject({
      id: "gsp_strict-replacement",
      status: "unclaimed",
    });
  });
});
