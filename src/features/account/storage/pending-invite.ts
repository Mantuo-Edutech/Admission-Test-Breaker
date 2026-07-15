import { normalizeInviteCode } from "../domain.js";

const PENDING_INVITE_KEY = "admission-test-breaker.pending-invite.v1";

export interface PendingInviteStore {
  load(): string | null;
  save(code: string): void;
  clear(): void;
}

export class SessionPendingInviteStore implements PendingInviteStore {
  constructor(private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {}

  load(): string | null {
    const stored = this.storage.getItem(PENDING_INVITE_KEY);
    return stored === null || stored.length === 0 ? null : stored;
  }

  save(code: string): void {
    this.storage.setItem(PENDING_INVITE_KEY, normalizeInviteCode(code));
  }

  clear(): void {
    this.storage.removeItem(PENDING_INVITE_KEY);
  }
}
