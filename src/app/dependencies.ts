import type {
  LearningEventId,
  PracticeSessionId,
} from "../platform/shared/ids.js";
import { LocalGuestSpaceStore } from "../features/guest-space/storage/local-store.js";
import type { GuestSpaceStore } from "../features/guest-space/storage/store.js";
import { LocalPreparationProfileStore } from "../features/preparation-profile/storage/local-store.js";
import type { PreparationProfileStore } from "../features/preparation-profile/storage/store.js";
import { LocalPracticeSessionStore } from "../features/practice/storage/local-store.js";
import type { PracticeSessionStore } from "../features/practice/storage/store.js";

export interface AppIdFactory {
  sessionId(): PracticeSessionId;
  eventId(): LearningEventId;
}

export interface AppServices {
  store: PracticeSessionStore;
  guestSpaceStore: GuestSpaceStore;
  profileStore: PreparationProfileStore;
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
  const now = () => new Date();
  return {
    store: new LocalPracticeSessionStore(globalThis.localStorage),
    guestSpaceStore: new LocalGuestSpaceStore(
      globalThis.localStorage,
      now,
      randomSuffix,
    ),
    profileStore: new LocalPreparationProfileStore(globalThis.localStorage, now),
    now,
    ids: {
      sessionId: () => `ses_${randomSuffix()}`,
      eventId: () => `evt_${randomSuffix()}`,
    },
  };
}
