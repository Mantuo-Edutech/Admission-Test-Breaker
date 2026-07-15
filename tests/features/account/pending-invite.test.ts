import { describe, expect, it } from "vitest";
import { SessionPendingInviteStore } from "../../../src/features/account/storage/pending-invite.js";

describe("pending invite session storage", () => {
  it("keeps only the normalized code and can remove it after redemption", () => {
    const values = new Map<string, string>();
    const store = new SessionPendingInviteStore({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => { values.delete(key); },
    });

    store.save(" mantuo-tmua-local-2026-access ");
    expect(store.load()).toBe("MANTUOTMUALOCAL2026ACCESS");
    store.clear();
    expect(store.load()).toBeNull();
  });
});
