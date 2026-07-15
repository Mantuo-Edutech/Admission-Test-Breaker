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
import { createAccountAccessService } from "../features/account/supabase-account-service.js";
import type { AccountAccessService } from "../features/account/domain.js";
import { SessionPendingInviteStore } from "../features/account/storage/pending-invite.js";
import type { PendingInviteStore } from "../features/account/storage/pending-invite.js";

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
  accountAccess?: AccountAccessService;
  pendingInvite?: PendingInviteStore;
}

function randomSuffix(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createDefaultAppServices(): AppServices {
  const now = () => new Date();
  const browserOrigin = globalThis.location?.origin ?? "http://127.0.0.1:57145";
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
    accountAccess: createAccountAccessService(
      {
        url: import.meta.env.VITE_SUPABASE_URL,
        publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      browserOrigin,
    ),
    pendingInvite: new SessionPendingInviteStore(globalThis.sessionStorage),
  };
}
