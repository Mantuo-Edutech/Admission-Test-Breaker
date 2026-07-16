import { describe, expect, it } from "vitest";
import { readableAuthError } from "../../../src/features/account/supabase-account-service.js";

describe("Supabase account error copy", () => {
  it("explains that an unconfirmed local account is not a password failure", () => {
    expect(readableAuthError("Email not confirmed").message).toBe(
      "邮箱尚未确认。请先点击确认邮件中的链接，再重新登录",
    );
  });
});
