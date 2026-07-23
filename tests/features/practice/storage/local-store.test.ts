import { describe, expect, it } from "vitest";
import { practiceSessionReducer } from "../../../../src/features/practice/domain/reducer.js";
import { createPracticeSession } from "../../../../src/features/practice/domain/session.js";
import {
  LocalPracticeSessionStore,
  PRACTICE_SESSION_STORAGE_KEY,
} from "../../../../src/features/practice/storage/local-store.js";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
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
}

class ThrowingStorage implements Storage {
  get length(): number {
    throw new Error("storage unavailable");
  }

  clear(): void {
    throw new Error("storage unavailable");
  }

  getItem(): string | null {
    throw new Error("storage unavailable");
  }

  key(): string | null {
    throw new Error("storage unavailable");
  }

  removeItem(): void {
    throw new Error("storage unavailable");
  }

  setItem(): void {
    throw new Error("storage unavailable");
  }
}

function activeSession() {
  return createPracticeSession({
    id: "ses_storage-one",
    learningSpaceId: "gsp_browser-one",
    actor: { kind: "guest", actorId: "guest_browser-one" },
    startedAt: "2026-07-13T00:00:00.000Z",
    eventId: "evt_storage-started",
  });
}

function esatSession() {
  return createPracticeSession({
    id: "ses_esat-storage-one",
    learningSpaceId: "gsp_esat-browser-one",
    actor: { kind: "guest", actorId: "guest_esat-browser-one" },
    startedAt: "2026-07-13T00:00:00.000Z",
    eventId: "evt_esat-storage-started",
    paperId: "esat-mathematics-1-starter-v1",
    durationMinutes: 40,
  });
}

describe("local practice session store", () => {
  it("round-trips a valid local Guest session", async () => {
    const storage = new MemoryStorage();
    const store = new LocalPracticeSessionStore(storage);

    await expect(store.save(activeSession())).resolves.toEqual({
      persisted: true,
    });
    await expect(store.loadCurrent()).resolves.toEqual({
      session: activeSession(),
      issue: null,
    });
  });

  it("round-trips a non-TMUA session with its own paper ID and duration", async () => {
    const storage = new MemoryStorage();
    const store = new LocalPracticeSessionStore(storage);

    await expect(store.save(esatSession())).resolves.toEqual({ persisted: true });
    await expect(store.loadCurrent()).resolves.toEqual({
      session: esatSession(),
      issue: null,
    });
  });

  it("loads the previous TMUA key and migrates it on the next save", async () => {
    const storage = new MemoryStorage();
    const legacyKey = "tmua:practice:current:v1";
    storage.setItem(legacyKey, JSON.stringify(activeSession()));
    const store = new LocalPracticeSessionStore(storage);

    await expect(store.loadCurrent()).resolves.toEqual({
      session: activeSession(),
      issue: null,
    });
    await store.save(activeSession());

    expect(storage.getItem(legacyKey)).toBeNull();
    expect(storage.getItem(PRACTICE_SESSION_STORAGE_KEY)).not.toBeNull();
  });

  it("upgrades a schema-v2 session to the currently published immutable revision", async () => {
    const storage = new MemoryStorage();
    const current = activeSession();
    const legacy = { ...current } as Record<string, unknown>;
    legacy.schemaVersion = 2;
    delete legacy.paperRevisionId;
    delete legacy.contentDigest;
    storage.setItem(PRACTICE_SESSION_STORAGE_KEY, JSON.stringify(legacy));
    const store = new LocalPracticeSessionStore(storage);

    const loaded = await store.loadCurrent();

    expect(loaded.issue).toBeNull();
    expect(loaded.session).toMatchObject({
      schemaVersion: 3,
      paperId: "tmua-2023-p1",
      paperRevisionId: "tmua-2023-p1-r1",
      contentDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
  });

  it("round-trips a paused session with no active timing segment", async () => {
    const storage = new MemoryStorage();
    const store = new LocalPracticeSessionStore(storage);
    const paused = practiceSessionReducer(activeSession(), {
      type: "pause",
      eventId: "evt_storage-paused",
      timeEventId: "evt_storage-time-before-pause",
      at: "2026-07-13T00:05:00.000Z",
      reason: "visibility_hidden",
    });

    await expect(store.save(paused)).resolves.toEqual({ persisted: true });
    await expect(store.loadCurrent()).resolves.toEqual({
      session: paused,
      issue: null,
    });
  });

  it("round-trips a finalized session with no active timing segment", async () => {
    const storage = new MemoryStorage();
    const store = new LocalPracticeSessionStore(storage);
    const submitted = practiceSessionReducer(activeSession(), {
      type: "submit",
      eventId: "evt_storage-submitted",
      timeEventId: "evt_storage-time-before-submit",
      at: "2026-07-13T00:10:00.000Z",
      reason: "student",
    });

    await expect(store.save(submitted)).resolves.toEqual({ persisted: true });
    await expect(store.loadCurrent()).resolves.toEqual({
      session: submitted,
      issue: null,
    });
  });

  it("reports an empty store without treating it as an error", async () => {
    const store = new LocalPracticeSessionStore(new MemoryStorage());
    await expect(store.loadCurrent()).resolves.toEqual({
      session: null,
      issue: null,
    });
  });

  it("quarantines malformed JSON instead of trusting or deleting it silently", async () => {
    const storage = new MemoryStorage();
    storage.setItem(PRACTICE_SESSION_STORAGE_KEY, "{not-json");
    const store = new LocalPracticeSessionStore(
      storage,
      () => new Date("2026-07-13T12:00:00.000Z"),
    );

    await expect(store.loadCurrent()).resolves.toEqual({
      session: null,
      issue: "corrupt",
    });
    expect(storage.getItem(PRACTICE_SESSION_STORAGE_KEY)).toBeNull();
    expect(
      [...Array.from({ length: storage.length }, (_, index) => storage.key(index))]
        .filter((key): key is string => key !== null)
        .some((key) => key.startsWith("admission-test-breaker:practice:corrupt:")),
    ).toBe(true);
  });

  it("rejects and quarantines a schema-v1 session instead of claiming it", async () => {
    const storage = new MemoryStorage();
    const legacy = JSON.stringify({
      schemaVersion: 1,
      learnerSpaceId: "lsp_legacy-one",
      startedBy: { kind: "student", userId: "usr_legacy-one" },
    });
    storage.setItem(
      PRACTICE_SESSION_STORAGE_KEY,
      legacy,
    );
    const store = new LocalPracticeSessionStore(storage);

    await expect(store.loadCurrent()).resolves.toEqual({
      session: null,
      issue: "unsupported",
    });
    expect(storage.getItem(PRACTICE_SESSION_STORAGE_KEY)).toBeNull();
    expect(
      [...Array.from({ length: storage.length }, (_, index) => storage.key(index))]
        .filter((key): key is string => key !== null)
        .map((key) => storage.getItem(key)),
    ).toContain(legacy);
  });

  it("rejects an event that crosses the session tenant boundary", async () => {
    const storage = new MemoryStorage();
    const session = activeSession();
    storage.setItem(
      PRACTICE_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...session,
        events: [
          {
            ...session.events[0],
            learningSpaceId: "lsp_intruder",
          },
        ],
      }),
    );
    const store = new LocalPracticeSessionStore(storage);

    await expect(store.loadCurrent()).resolves.toEqual({
      session: null,
      issue: "corrupt",
    });
  });

  it("clears only the current-session key", async () => {
    const storage = new MemoryStorage();
    storage.setItem("another:application:key", "keep-me");
    const store = new LocalPracticeSessionStore(storage);
    await store.save(activeSession());

    await store.clearCurrent();

    expect(storage.getItem(PRACTICE_SESSION_STORAGE_KEY)).toBeNull();
    expect(storage.getItem("another:application:key")).toBe("keep-me");
  });

  it("keeps an in-memory session when browser persistence fails", async () => {
    const store = new LocalPracticeSessionStore(new ThrowingStorage());
    const session = activeSession();

    await expect(store.save(session)).resolves.toEqual({ persisted: false });
    await expect(store.loadCurrent()).resolves.toEqual({
      session,
      issue: null,
    });
  });
});
