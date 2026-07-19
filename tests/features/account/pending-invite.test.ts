import { describe, expect, it } from "vitest";
import { SessionPendingInviteStore } from "../../../src/features/account/storage/pending-invite.js";

describe("pending invite session storage", () => {
  it("keeps the normalized code and safe return target until redemption", () => {
    const values = new Map<string, string>();
    const store = new SessionPendingInviteStore({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => { values.delete(key); },
    });

    store.save(" mantuo-tmua-local-2026-access ");
    store.saveReturnTo("/results/ses_student-result");
    expect(store.load()).toBe("MANTUOTMUALOCAL2026ACCESS");
    expect(store.loadReturnTo()).toBe("/results/ses_student-result");
    expect(() => store.saveReturnTo("https://example.com/steal-session")).toThrow(
      "pending_invite_return_path_invalid",
    );
    values.set(
      "admission-test-breaker.pending-content-return.v1",
      "//example.com/tampered-session",
    );
    expect(store.loadReturnTo()).toBeNull();
    store.clear();
    expect(store.load()).toBeNull();
    expect(store.loadReturnTo()).toBeNull();
  });
});
