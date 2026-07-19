import type { PracticeSession } from "../practice/domain/session.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "../practice/storage/store.js";
import type { LearnerDataRepository } from "./repository.js";

function lastActivityAt(session: PracticeSession): number {
  return Date.parse(session.events.at(-1)?.occurredAt ?? session.startedAt);
}

function isGuestSession(session: PracticeSession): boolean {
  return session.learningSpaceId.startsWith("gsp_") && session.startedBy.kind === "guest";
}

export class AuthAwarePracticeSessionStore implements PracticeSessionStore {
  private transientSession: PracticeSession | null = null;
  private transientUnsynced = false;

  constructor(
    private readonly localStore: PracticeSessionStore,
    private readonly repository: LearnerDataRepository,
  ) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    let context;
    try {
      context = await this.repository.currentContext();
    } catch {
      const local = await this.localStore.loadCurrent();
      return isGuestSessionOrNull(local.session)
        ? { ...local, issue: local.issue ?? "unavailable", scope: "device" }
        : { session: this.transientSession, issue: "unavailable", scope: "memory" };
    }
    if (context === null) {
      const local = await this.localStore.loadCurrent();
      if (isGuestSessionOrNull(local.session)) {
        return { ...local, scope: "device" };
      }
      await this.localStore.clearCurrent();
      return { session: null, issue: "corrupt", scope: "device" };
    }

    const local = await this.localStore.loadCurrent();
    try {
      const cloud = await this.repository.loadCurrentPracticeSession();
      const guestLocal = isGuestSessionOrNull(local.session) ? local.session : null;
      if (
        guestLocal !== null &&
        (cloud === null || lastActivityAt(guestLocal) > lastActivityAt(cloud))
      ) {
        const claimed = await this.repository.savePracticeSession(guestLocal);
        await this.localStore.clearCurrent();
        this.transientSession = claimed;
        this.transientUnsynced = false;
        return { session: claimed, issue: null, scope: "account" };
      }
      if (cloud !== null) {
        await this.localStore.clearCurrent();
        this.transientSession = cloud;
        this.transientUnsynced = false;
        return { session: cloud, issue: null, scope: "account" };
      }
      return {
        session: this.transientSession,
        issue: this.transientUnsynced ? "unavailable" : local.issue,
        scope: this.transientUnsynced ? "memory" : "account",
      };
    } catch {
      if (isGuestSessionOrNull(local.session)) {
        this.transientSession = local.session;
        this.transientUnsynced = local.session !== null;
      }
      return {
        session: this.transientSession,
        issue: local.issue ?? "unavailable",
        scope: "memory",
      };
    }
  }

  async save(session: PracticeSession): Promise<SessionSaveResult> {
    let context;
    try {
      context = await this.repository.currentContext();
    } catch {
      this.transientSession = session;
      this.transientUnsynced = true;
      return { persisted: false, durable: false, issue: "unavailable", scope: "memory" };
    }
    if (context === null) return this.localStore.save(session);

    try {
      const saved = await this.repository.savePracticeSession(session);
      this.transientSession = saved;
      this.transientUnsynced = false;
      await this.localStore.clearCurrent();
      return { persisted: true, durable: true, scope: "account" };
    } catch {
      this.transientSession = session;
      this.transientUnsynced = true;
      return { persisted: false, durable: false, issue: "unavailable", scope: "memory" };
    }
  }

  async clearCurrent(): Promise<void> {
    this.transientSession = null;
    this.transientUnsynced = false;
    await this.localStore.clearCurrent();
  }
}

function isGuestSessionOrNull(
  session: PracticeSession | null,
): session is PracticeSession | null {
  return session === null || isGuestSession(session);
}
