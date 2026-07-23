import { describe, expect, it } from "vitest";
import { AuthAwarePracticeHistoryReader } from "../../../src/features/learner-data/auth-aware-practice-history.js";
import type { LearnerDataRepository } from "../../../src/features/learner-data/repository.js";
import { createPracticeSession, type PracticeSession } from "../../../src/features/practice/domain/session.js";
import { LocalPracticeHistoryStore } from "../../../src/features/practice/history/local-history-store.js";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function guestSession(): PracticeSession {
  return createPracticeSession({
    id: "ses_history-claim",
    learningSpaceId: "gsp_history-claim",
    actor: { kind: "guest", actorId: "guest_history-claim" },
    paperId: "ucat-verbal-reasoning-starter-v1",
    durationMinutes: 6,
    startedAt: "2026-07-18T10:00:00.000Z",
    eventId: "evt_history-claim-start",
  });
}

function asStudent(session: PracticeSession): PracticeSession {
  const actor = { kind: "student" as const, userId: "usr_history-owner" as const };
  return {
    ...session,
    learningSpaceId: "lsp_history-owner",
    startedBy: actor,
    events: session.events.map((event) => ({
      ...event,
      learningSpaceId: "lsp_history-owner",
      actor,
    })),
  };
}

function repository(authenticated: boolean, failSave = false) {
  const cloud: PracticeSession[] = [];
  const saved: PracticeSession[] = [];
  const value = {
    async currentContext() {
      return authenticated
        ? { authUserId: "auth_history-owner", platformUserId: "usr_history-owner", learnerSpaceId: "lsp_history-owner" }
        : null;
    },
    async savePracticeSession(session: PracticeSession) {
      if (failSave) throw new Error("unavailable");
      saved.push(session);
      const canonical = asStudent(session);
      const existingIndex = cloud.findIndex((candidate) => candidate.id === canonical.id);
      if (existingIndex >= 0) cloud.splice(existingIndex, 1);
      cloud.push(canonical);
      return canonical;
    },
    async listPracticeSessions() { return cloud; },
  } as unknown as LearnerDataRepository;
  return { value, saved, cloud };
}

describe("auth-aware practice history", () => {
  it("keeps anonymous history on the current device", async () => {
    const local = new LocalPracticeHistoryStore(new MemoryStorage());
    await local.record(guestSession());
    const remote = repository(false);

    const result = await new AuthAwarePracticeHistoryReader(local, remote.value).listRecent();

    expect(result).toMatchObject({ scope: "device", issue: null });
    expect(result.sessions.map((session) => session.id)).toEqual(["ses_history-claim"]);
    expect(remote.saved).toEqual([]);
  });

  it("claims local Guest history into the authenticated learner space and removes the shared copy", async () => {
    const local = new LocalPracticeHistoryStore(new MemoryStorage());
    await local.record(guestSession());
    const remote = repository(true);

    const result = await new AuthAwarePracticeHistoryReader(local, remote.value).listRecent();

    expect(remote.saved).toHaveLength(1);
    expect(result).toMatchObject({ scope: "account", issue: null });
    expect(result.sessions[0]).toMatchObject({
      id: "ses_history-claim",
      learningSpaceId: "lsp_history-owner",
      startedBy: { kind: "student", userId: "usr_history-owner" },
    });
    expect((await local.listRecent()).sessions).toEqual([]);
  });

  it("does not discard an unsynced Guest snapshot when the account repository is unavailable", async () => {
    const local = new LocalPracticeHistoryStore(new MemoryStorage());
    await local.record(guestSession());
    const remote = repository(true, true);

    const result = await new AuthAwarePracticeHistoryReader(local, remote.value).listRecent();

    expect(result).toMatchObject({ scope: "mixed", issue: "unavailable" });
    expect(result.sessions.map((session) => session.id)).toEqual(["ses_history-claim"]);
    expect((await local.listRecent()).sessions).toHaveLength(1);
  });
});
