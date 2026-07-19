import type { PracticeSessionId } from "../../../platform/shared/ids.js";
import type { PracticeSession } from "../domain/session.js";
import { parseStoredPracticeSession } from "../storage/local-store.js";
import type {
  PracticeHistoryArchive,
  PracticeHistoryLoadResult,
} from "./store.js";

export const PRACTICE_HISTORY_STORAGE_KEY = "admission-breaker:practice:history:v1";
const corruptKeyPrefix = "admission-breaker:practice:history:corrupt:";
const maximumStoredSessions = 30;

interface PracticeHistoryEnvelope {
  readonly schemaVersion: 1;
  readonly sessions: readonly PracticeSession[];
}

class UnsupportedPracticeHistoryError extends Error {}

function lastActivityAt(session: PracticeSession): number {
  return Date.parse(session.events.at(-1)?.occurredAt ?? session.startedAt);
}

function normalisedLimit(limit: number | undefined): number {
  const resolved = limit ?? maximumStoredSessions;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > 100) {
    throw new Error("Practice history limit must be an integer between 1 and 100");
  }
  return resolved;
}

function parseEnvelope(value: unknown): PracticeHistoryEnvelope {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Practice history must be an object");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) {
    throw new UnsupportedPracticeHistoryError("Practice history schema is unsupported");
  }
  if (Object.keys(record).length !== 2 || !Array.isArray(record.sessions)) {
    throw new Error("Practice history fields are invalid");
  }
  const sessions = record.sessions.map((session) => parseStoredPracticeSession(session));
  if (sessions.length > maximumStoredSessions) {
    throw new Error("Practice history exceeds the device retention limit");
  }
  if (new Set(sessions.map((session) => session.id)).size !== sessions.length) {
    throw new Error("Practice history contains duplicate sessions");
  }
  return {
    schemaVersion: 1,
    sessions: [...sessions].sort((left, right) => lastActivityAt(right) - lastActivityAt(left)),
  };
}

export class LocalPracticeHistoryStore implements PracticeHistoryArchive {
  private memory: PracticeHistoryEnvelope = { schemaVersion: 1, sessions: [] };
  private loaded = false;

  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listRecent(limit?: number): Promise<PracticeHistoryLoadResult> {
    const count = normalisedLimit(limit);
    const loaded = this.load();
    return {
      sessions: loaded.envelope.sessions.slice(0, count),
      issue: loaded.issue,
      scope: "device",
    };
  }

  async record(session: PracticeSession): Promise<{ persisted: boolean }> {
    const normalised = parseStoredPracticeSession(JSON.parse(JSON.stringify(session)) as unknown);
    const loaded = this.load();
    const sessions = [
      normalised,
      ...loaded.envelope.sessions.filter((candidate) => candidate.id !== normalised.id),
    ]
      .sort((left, right) => lastActivityAt(right) - lastActivityAt(left))
      .slice(0, maximumStoredSessions);
    this.memory = { schemaVersion: 1, sessions };
    this.loaded = true;
    return { persisted: this.persist() };
  }

  async remove(sessionIds: readonly PracticeSessionId[]): Promise<void> {
    if (sessionIds.length === 0) return;
    const ids = new Set(sessionIds);
    const loaded = this.load();
    this.memory = {
      schemaVersion: 1,
      sessions: loaded.envelope.sessions.filter((session) => !ids.has(session.id)),
    };
    this.loaded = true;
    this.persist();
  }

  async clear(): Promise<void> {
    this.memory = { schemaVersion: 1, sessions: [] };
    this.loaded = true;
    try { this.storage.removeItem(PRACTICE_HISTORY_STORAGE_KEY); } catch { /* Memory is still cleared. */ }
  }

  private load(): {
    envelope: PracticeHistoryEnvelope;
    issue: PracticeHistoryLoadResult["issue"];
  } {
    if (this.loaded) return { envelope: this.memory, issue: null };
    let raw: string | null;
    try { raw = this.storage.getItem(PRACTICE_HISTORY_STORAGE_KEY); } catch {
      this.loaded = true;
      return { envelope: this.memory, issue: null };
    }
    if (raw === null) {
      this.loaded = true;
      return { envelope: this.memory, issue: null };
    }
    try {
      this.memory = parseEnvelope(JSON.parse(raw) as unknown);
      this.loaded = true;
      return { envelope: this.memory, issue: null };
    } catch (error) {
      this.memory = { schemaVersion: 1, sessions: [] };
      this.loaded = true;
      this.quarantine(raw);
      return {
        envelope: this.memory,
        issue: error instanceof UnsupportedPracticeHistoryError ? "unsupported" : "corrupt",
      };
    }
  }

  private persist(): boolean {
    try {
      this.storage.setItem(PRACTICE_HISTORY_STORAGE_KEY, JSON.stringify(this.memory));
      return true;
    } catch {
      return false;
    }
  }

  private quarantine(raw: string): void {
    const timestamp = this.now().toISOString().replace(/[:.]/gu, "-");
    try { this.storage.setItem(`${corruptKeyPrefix}${timestamp}`, raw); } catch { /* Keep classification. */ }
    try { this.storage.removeItem(PRACTICE_HISTORY_STORAGE_KEY); } catch { /* Never trust it again in memory. */ }
  }
}
