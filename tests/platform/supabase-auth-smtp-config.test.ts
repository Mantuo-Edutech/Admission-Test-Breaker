import { describe, expect, it } from "vitest";
import {
  authSmtpIsReady,
  authSmtpPatch,
  smtpConfiguration,
} from "../../scripts/configure-supabase-auth-smtp.js";

const configuration = smtpConfiguration({
  host: "SMTP.RESEND.COM",
  port: "587",
  adminEmail: "NO-REPLY@AUTH.UKTEST.CC",
  senderName: "满托 UK Test",
  user: "resend",
});

describe("Supabase Auth SMTP configuration", () => {
  it("builds the documented Management API patch without weakening confirmation", () => {
    expect(authSmtpPatch(configuration, "smtp-password-value")).toEqual({
      external_email_enabled: true,
      mailer_secure_email_change_enabled: true,
      mailer_autoconfirm: false,
      smtp_admin_email: "no-reply@auth.uktest.cc",
      smtp_host: "smtp.resend.com",
      smtp_port: 587,
      smtp_user: "resend",
      smtp_pass: "smtp-password-value",
      smtp_sender_name: "满托 UK Test",
    });
  });

  it("rejects placeholder, URL-shaped and insecurely ambiguous SMTP inputs", () => {
    expect(() => smtpConfiguration({
      ...configuration,
      host: "https://smtp.resend.com",
    })).toThrow("production SMTP hostname");
    expect(() => smtpConfiguration({
      ...configuration,
      host: "smtp.example.com",
    })).toThrow("production SMTP hostname");
    expect(() => smtpConfiguration({
      ...configuration,
      host: "smtp.invalid",
    })).toThrow("production SMTP hostname");
    expect(() => smtpConfiguration({
      ...configuration,
      host: "127.0.0.1",
    })).toThrow("production SMTP hostname");
    expect(() => smtpConfiguration({
      ...configuration,
      port: "25",
    })).toThrow("465, 587 or 2525");
    expect(() => smtpConfiguration({
      ...configuration,
      port: "587.0",
    })).toThrow("465, 587 or 2525");
    expect(() => smtpConfiguration({
      ...configuration,
      adminEmail: "no-reply@example.com",
    })).toThrow("production sender email");
    expect(() => authSmtpPatch(configuration, "short")).toThrow("SMTP_PASS");
  });

  it("requires an exact non-secret identity match and stored credentials", () => {
    const ready = {
      external_email_enabled: true,
      mailer_secure_email_change_enabled: true,
      mailer_autoconfirm: false,
      smtp_admin_email: configuration.adminEmail,
      smtp_host: configuration.host,
      smtp_port: "587",
      smtp_user: configuration.user,
      smtp_pass: "stored-secret",
      smtp_sender_name: configuration.senderName,
    };
    expect(authSmtpIsReady(ready, configuration)).toBe(true);
    expect(authSmtpIsReady({ ...ready, smtp_host: "smtp.other.com" }, configuration)).toBe(false);
    expect(authSmtpIsReady({ ...ready, smtp_pass: "" }, configuration)).toBe(false);
    expect(authSmtpIsReady({ ...ready, mailer_autoconfirm: true }, configuration)).toBe(false);
  });
});
