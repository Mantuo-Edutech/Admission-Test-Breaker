import type {
  LearningEventId,
  PracticeSessionId,
} from "../platform/shared/ids.js";
import { LocalPracticeSessionStore } from "../features/practice/storage/local-store.js";
import type { PracticeSessionStore } from "../features/practice/storage/store.js";

export interface AppIdFactory {
  sessionId(): PracticeSessionId;
  eventId(): LearningEventId;
}

export interface AppServices {
  store: PracticeSessionStore;
  now(): Date;
  ids: AppIdFactory;
}

function randomSuffix(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createDefaultAppServices(): AppServices {
  return {
    store: new LocalPracticeSessionStore(globalThis.localStorage),
    now: () => new Date(),
    ids: {
      sessionId: () => `ses_${randomSuffix()}`,
      eventId: () => `evt_${randomSuffix()}`,
    },
  };
}
