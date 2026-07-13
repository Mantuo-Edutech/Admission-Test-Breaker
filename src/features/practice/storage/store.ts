import type { PracticeSession } from "../domain/session.js";

export interface SessionLoadResult {
  session: PracticeSession | null;
  issue: "corrupt" | "unsupported" | null;
}

export interface SessionSaveResult {
  persisted: boolean;
}

export interface PracticeSessionStore {
  loadCurrent(): Promise<SessionLoadResult>;
  save(session: PracticeSession): Promise<SessionSaveResult>;
  clearCurrent(): Promise<void>;
}
