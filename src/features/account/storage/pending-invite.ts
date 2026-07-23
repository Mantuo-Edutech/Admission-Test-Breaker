import { normalizeInviteCode, safeInternalReturnPath } from "../domain.js";

const PENDING_INVITE_KEY = "admission-test-breaker.pending-invite.v1";
const PENDING_RETURN_TO_KEY = "admission-test-breaker.pending-content-return.v1";

export interface PendingInviteStore {
  load(): string | null;
  save(code: string): void;
  loadReturnTo(): string | null;
  saveReturnTo(path: string): void;
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

  loadReturnTo(): string | null {
    const stored = this.storage.getItem(PENDING_RETURN_TO_KEY);
    return safeInternalReturnPath(stored);
  }

  saveReturnTo(path: string): void {
    const safePath = safeInternalReturnPath(path);
    if (safePath === null) throw new Error("pending_invite_return_path_invalid");
    this.storage.setItem(PENDING_RETURN_TO_KEY, safePath);
  }

  clear(): void {
    this.storage.removeItem(PENDING_INVITE_KEY);
    this.storage.removeItem(PENDING_RETURN_TO_KEY);
  }
}
