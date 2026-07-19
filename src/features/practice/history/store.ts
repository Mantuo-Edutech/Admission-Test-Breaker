import type { PracticeSessionId } from "../../../platform/shared/ids.js";
import type { PracticeSession } from "../domain/session.js";

export interface PracticeHistoryLoadResult {
  readonly sessions: readonly PracticeSession[];
  readonly issue: "corrupt" | "unsupported" | "unavailable" | null;
  readonly scope: "device" | "account" | "mixed" | "memory";
}

export interface PracticeHistoryReader {
  listRecent(limit?: number): Promise<PracticeHistoryLoadResult>;
}

export interface PracticeHistoryArchive extends PracticeHistoryReader {
  record(session: PracticeSession): Promise<{ persisted: boolean }>;
  remove(sessionIds: readonly PracticeSessionId[]): Promise<void>;
  clear(): Promise<void>;
}
