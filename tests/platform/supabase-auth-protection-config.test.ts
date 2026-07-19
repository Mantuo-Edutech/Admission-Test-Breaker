import { describe, expect, it } from "vitest";
import {
  authProtectionIsReady,
  authProtectionPatch,
} from "../../scripts/configure-supabase-auth-protection.js";

describe("Supabase Auth protection configuration", () => {
  it("builds the narrow Management API patch without browser configuration", () => {
    expect(authProtectionPatch(
      "  secret-turnstile-value  ",
      "https://practice.example.com",
      "https://legacy.example.com/auth/confirm",
    )).toEqual({
      security_captcha_enabled: true,
      security_captcha_provider: "turnstile",
      security_captcha_secret: "secret-turnstile-value",
      site_url: "https://practice.example.com",
      uri_allow_list: "https://legacy.example.com/auth/confirm,https://practice.example.com/auth/confirm,https://practice.example.com/auth/reset",
      external_email_enabled: true,
      mailer_autoconfirm: false,
      password_min_length: 10,
      password_required_characters: "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789",
      refresh_token_rotation_enabled: true,
    });
    expect(() => authProtectionPatch(
      "short",
      "https://practice.example.com",
    )).toThrow("implausibly short");
    expect(() => authProtectionPatch(
      "secret-turnstile-value",
      "http://practice.example.com",
    )).toThrow("HTTPS origin");
  });

  it("only accepts enabled Turnstile as production-ready", () => {
    expect(authProtectionIsReady({
      security_captcha_enabled: true,
      security_captcha_provider: "turnstile",
    })).toBe(true);
    expect(authProtectionIsReady({
      security_captcha_enabled: false,
      security_captcha_provider: "turnstile",
    })).toBe(false);
    expect(authProtectionIsReady({
      security_captcha_enabled: true,
      security_captcha_provider: "hcaptcha",
    })).toBe(false);
  });

  it("checks the server-side password, confirmation and redirect baseline", () => {
    const origin = "https://practice.example.com";
    const ready = {
      security_captcha_enabled: true,
      security_captcha_provider: "turnstile",
      site_url: origin,
      uri_allow_list: `${origin}/auth/confirm,${origin}/auth/reset`,
      external_email_enabled: true,
      mailer_autoconfirm: false,
      password_min_length: 10,
      password_required_characters: "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789",
      refresh_token_rotation_enabled: true,
    };
    expect(authProtectionIsReady(ready, origin)).toBe(true);
    expect(authProtectionIsReady({ ...ready, mailer_autoconfirm: true }, origin)).toBe(false);
    expect(authProtectionIsReady({ ...ready, password_min_length: 6 }, origin)).toBe(false);
    expect(authProtectionIsReady({ ...ready, uri_allow_list: "" }, origin)).toBe(false);
  });
});
