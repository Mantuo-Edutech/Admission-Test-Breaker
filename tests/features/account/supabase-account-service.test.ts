import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { validateBotChallenge } from "../../../src/features/account/components/AccountBotChallenge.js";
import {
  readableAuthError,
  SupabaseAccountAccessService,
} from "../../../src/features/account/supabase-account-service.js";

describe("Supabase account error copy", () => {
  it("explains that an unconfirmed local account is not a password failure", () => {
    expect(readableAuthError("Email not confirmed").message).toBe(
      "邮箱尚未确认。请先点击确认邮件中的链接，再重新登录",
    );
  });

  it("turns CAPTCHA failures into a retryable student-facing message", () => {
    expect(readableAuthError("captcha verification process failed").message).toBe(
      "安全验证无效或已经过期，请重新完成验证",
    );
  });
});

describe("account bot protection", () => {
  const requiredProtection = {
    provider: "turnstile" as const,
    required: true,
    siteKey: "turnstile-site-key",
  };

  it("requires a solved challenge when production protection is enabled", () => {
    expect(validateBotChallenge(requiredProtection, null)).toBe("请先完成安全验证");
    expect(validateBotChallenge(requiredProtection, "captcha-token")).toBeUndefined();
    expect(validateBotChallenge({
      ...requiredProtection,
      siteKey: null,
    }, null)).toContain("尚未配置");
  });

  it("passes a fresh CAPTCHA token to sign-up, sign-in and password reset", async () => {
    const auth = {
      signUp: vi.fn(async () => ({
        data: { session: null, user: { email: "student@example.com" } },
        error: null,
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { user: { email: "student@example.com" } },
        error: null,
      })),
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    };
    const service = new SupabaseAccountAccessService(
      { auth } as unknown as SupabaseClient,
      "https://practice.example.com/auth/confirm",
      "https://practice.example.com/auth/reset",
      requiredProtection,
    );

    await service.register(" student@example.com ", "SecurePass1", " register-token ");
    await service.signIn(" student@example.com ", "SecurePass1", " login-token ");
    await service.requestPasswordReset(" student@example.com ", " reset-token ");

    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "student@example.com",
      options: expect.objectContaining({ captchaToken: "register-token" }),
    }));
    expect(auth.signInWithPassword).toHaveBeenCalledWith(expect.objectContaining({
      email: "student@example.com",
      options: { captchaToken: "login-token" },
    }));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "student@example.com",
      expect.objectContaining({ captchaToken: "reset-token" }),
    );
  });

  it("fails closed before calling Supabase when a required token is absent", async () => {
    const signUp = vi.fn();
    const service = new SupabaseAccountAccessService(
      { auth: { signUp } } as unknown as SupabaseClient,
      "https://practice.example.com/auth/confirm",
      "https://practice.example.com/auth/reset",
      requiredProtection,
    );

    await expect(service.register("student@example.com", "SecurePass1")).rejects.toThrow(
      "请先完成安全验证",
    );
    expect(signUp).not.toHaveBeenCalled();
  });
});
