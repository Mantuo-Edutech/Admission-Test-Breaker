import type { PracticeSession } from "../practice/domain/session.js";
import type {
  PracticeHistoryArchive,
  PracticeHistoryLoadResult,
  PracticeHistoryReader,
} from "../practice/history/store.js";
import type { LearnerDataRepository } from "./repository.js";

function isGuestSession(session: PracticeSession): boolean {
  return session.learningSpaceId.startsWith("gsp_") && session.startedBy.kind === "guest";
}

function lastActivityAt(session: PracticeSession): number {
  return Date.parse(session.events.at(-1)?.occurredAt ?? session.startedAt);
}

function mergeSessions(
  primary: readonly PracticeSession[],
  secondary: readonly PracticeSession[],
  limit: number,
): readonly PracticeSession[] {
  const byId = new Map(primary.map((session) => [session.id, session]));
  for (const session of secondary) if (!byId.has(session.id)) byId.set(session.id, session);
  return [...byId.values()]
    .sort((left, right) => lastActivityAt(right) - lastActivityAt(left))
    .slice(0, limit);
}

export class AuthAwarePracticeHistoryReader implements PracticeHistoryReader {
  constructor(
    private readonly local: PracticeHistoryArchive,
    private readonly repository: LearnerDataRepository,
  ) {}

  async listRecent(limit = 30): Promise<PracticeHistoryLoadResult> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("Practice history limit must be an integer between 1 and 100");
    }
    const local = await this.local.listRecent(limit);
    let context;
    try { context = await this.repository.currentContext(); } catch {
      return { ...local, issue: "unavailable", scope: "device" };
    }
    if (context === null) return local;

    const pending = local.sessions.filter(isGuestSession);
    const claimedIds: PracticeSession["id"][] = [];
    const unsynced: PracticeSession[] = [];
    for (const session of pending) {
      try {
        await this.repository.savePracticeSession(session);
        claimedIds.push(session.id);
      } catch {
        unsynced.push(session);
      }
    }
    await this.local.remove(claimedIds);

    try {
      const cloud = await this.repository.listPracticeSessions(limit);
      return {
        sessions: mergeSessions(cloud, unsynced, limit),
        issue: unsynced.length > 0 ? "unavailable" : local.issue,
        scope: unsynced.length > 0 ? "mixed" : "account",
      };
    } catch {
      return {
        sessions: unsynced,
        issue: "unavailable",
        scope: unsynced.length > 0 ? "memory" : "account",
      };
    }
  }
}
