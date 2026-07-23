import type { PracticeSession } from "../domain/session.js";

export interface SessionLoadResult {
  session: PracticeSession | null;
  issue: "corrupt" | "unsupported" | "unavailable" | null;
  scope?: "device" | "account" | "memory";
}

export interface SessionSaveResult {
  persisted: boolean;
  durable?: boolean;
  issue?: "unavailable" | "conflict";
  scope?: "device" | "account" | "memory";
}

export interface PracticeSessionStore {
  loadCurrent(): Promise<SessionLoadResult>;
  save(session: PracticeSession): Promise<SessionSaveResult>;
  clearCurrent(): Promise<void>;
}
