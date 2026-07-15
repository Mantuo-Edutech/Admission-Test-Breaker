import { describe, expect, it } from "vitest";
import {
  inviteCodeLooksValid,
  normalizeInviteCode,
  validateRegistration,
} from "../../../src/features/account/domain.js";

describe("account access domain", () => {
  it("normalizes human-friendly invite codes without weakening length checks", () => {
    expect(normalizeInviteCode(" mantuo-tmua-local-2026-access ")).toBe(
      "MANTUOTMUALOCAL2026ACCESS",
    );
    expect(inviteCodeLooksValid("MANTUO-TMUA-LOCAL-2026-ACCESS")).toBe(true);
    expect(inviteCodeLooksValid("short-code")).toBe(false);
  });

  it("validates the same password policy configured in Supabase", () => {
    expect(
      validateRegistration({
        email: "student@example.com",
        password: "SecurePass1",
        passwordConfirmation: "SecurePass1",
      }),
    ).toEqual({});
    expect(
      validateRegistration({
        email: "not-an-email",
        password: "lowercase1",
        passwordConfirmation: "different",
      }),
    ).toEqual({
      email: "请输入有效的邮箱地址",
      password: "密码需要同时包含大写字母、小写字母和数字",
      passwordConfirmation: "两次输入的密码不一致",
    });
  });
});
