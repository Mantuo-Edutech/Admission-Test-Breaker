import { describe, expect, it } from "vitest";
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
    learnerSpaceId: "lsp_local-demo",
    actor: { kind: "student", userId: "usr_local-demo" },
    startedAt: "2026-07-13T00:00:00.000Z",
    eventId: "evt_storage-started",
  });
}

describe("local practice session store", () => {
  it("round-trips a valid learner-owned session", async () => {
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
        .some((key) => key.startsWith("tmua:practice:corrupt:")),
    ).toBe(true);
  });

  it("rejects and quarantines an unsupported schema version", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PRACTICE_SESSION_STORAGE_KEY,
      JSON.stringify({ ...activeSession(), schemaVersion: 2 }),
    );
    const store = new LocalPracticeSessionStore(storage);

    await expect(store.loadCurrent()).resolves.toEqual({
      session: null,
      issue: "unsupported",
    });
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
            learnerSpaceId: "lsp_intruder",
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
