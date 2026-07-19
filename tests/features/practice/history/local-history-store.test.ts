import { describe, expect, it } from "vitest";
import { practiceSessionReducer } from "../../../../src/features/practice/domain/reducer.js";
import { createPracticeSession } from "../../../../src/features/practice/domain/session.js";
import {
  LocalPracticeHistoryStore,
  PRACTICE_HISTORY_STORAGE_KEY,
} from "../../../../src/features/practice/history/local-history-store.js";
import { LocalPracticeSessionStore } from "../../../../src/features/practice/storage/local-store.js";

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

function session(id: `ses_${string}`, startedAt: string, eventId: `evt_${string}`) {
  return createPracticeSession({
    id,
    learningSpaceId: "gsp_history-device",
    actor: { kind: "guest", actorId: "guest_history-device" },
    paperId: "ucat-quantitative-reasoning-starter-v1",
    durationMinutes: 8,
    startedAt,
    eventId,
  });
}

describe("local private practice history", () => {
  it("keeps separate full snapshots, replaces updates and orders by last activity", async () => {
    const storage = new MemoryStorage();
    const history = new LocalPracticeHistoryStore(storage);
    const first = session("ses_history-first", "2026-07-17T10:00:00.000Z", "evt_history-first");
    const second = session("ses_history-second", "2026-07-18T10:00:00.000Z", "evt_history-second");
    await history.record(first);
    await history.record(second);
    const updatedFirst = practiceSessionReducer(first, {
      type: "answer",
      eventId: "evt_history-first-answer",
      questionId: `${first.paperId}-q01`,
      answer: "A",
      at: "2026-07-19T10:01:00.000Z",
    });
    await history.record(updatedFirst);

    const loaded = await history.listRecent();
    expect(loaded.sessions.map((candidate) => candidate.id)).toEqual([
      "ses_history-first",
      "ses_history-second",
    ]);
    expect(loaded.sessions[0]?.answers).toEqual({ [`${first.paperId}-q01`]: "A" });
    expect(JSON.parse(storage.getItem(PRACTICE_HISTORY_STORAGE_KEY) ?? "null")).toMatchObject({
      schemaVersion: 1,
      sessions: [{ id: "ses_history-first" }, { id: "ses_history-second" }],
    });
  });

  it("lets clearing the resumable session preserve the historical snapshot", async () => {
    const storage = new MemoryStorage();
    const history = new LocalPracticeHistoryStore(storage);
    const current = new LocalPracticeSessionStore(storage, () => new Date(), history);
    const saved = session("ses_history-preserved", "2026-07-18T10:00:00.000Z", "evt_history-preserved");

    await current.save(saved);
    await current.clearCurrent();

    expect((await current.loadCurrent()).session).toBeNull();
    expect((await history.listRecent()).sessions.map((candidate) => candidate.id)).toEqual([
      "ses_history-preserved",
    ]);
  });

  it("quarantines malformed history without exposing unvalidated sessions", async () => {
    const storage = new MemoryStorage();
    storage.setItem(PRACTICE_HISTORY_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, sessions: [{ id: "bad" }] }));
    const history = new LocalPracticeHistoryStore(storage, () => new Date("2026-07-18T12:00:00.000Z"));

    await expect(history.listRecent()).resolves.toMatchObject({ sessions: [], issue: "corrupt" });
    expect(storage.getItem(PRACTICE_HISTORY_STORAGE_KEY)).toBeNull();
    expect(storage.keys().some((key) => key.startsWith("admission-breaker:practice:history:corrupt:"))).toBe(true);
  });
});
