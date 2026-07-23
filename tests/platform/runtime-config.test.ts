import { afterEach, describe, expect, it } from "vitest";
import { resolveBrowserConfiguration } from "../../src/platform/runtime-config.js";

afterEach(() => {
  delete window.__MANTUO_RUNTIME_CONFIG__;
});

describe("browser runtime configuration", () => {
  it("lets the deployed runtime select Supabase without rebuilding the image", () => {
    window.__MANTUO_RUNTIME_CONFIG__ = {
      supabaseUrl: "https://production.supabase.co",
      supabasePublishableKey: "sb_publishable_production",
      turnstileSiteKey: "turnstile-production",
      release: "sha-123",
      environment: "production",
    };

    expect(resolveBrowserConfiguration({
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "local-key",
    })).toEqual({
      supabaseUrl: "https://production.supabase.co",
      supabasePublishableKey: "sb_publishable_production",
      release: "sha-123",
      environment: "production",
      source: "runtime",
      authProtection: {
        provider: "turnstile",
        required: true,
        siteKey: "turnstile-production",
      },
    });
  });

  it("uses build-time browser-safe values for local development", () => {
    expect(resolveBrowserConfiguration({
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "local-key",
      VITE_TURNSTILE_SITE_KEY: "turnstile-local",
    }, {})).toMatchObject({
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "local-key",
      source: "build",
      authProtection: {
        provider: "turnstile",
        required: true,
        siteKey: "turnstile-local",
      },
    });
  });

  it("fails closed when neither source contains a complete public pair", () => {
    expect(resolveBrowserConfiguration({
      VITE_SUPABASE_URL: "https://missing-key.supabase.co",
    }, {
      supabasePublishableKey: "missing-url",
      environment: "production",
    })).toEqual({
      release: "development",
      environment: "production",
      source: "unconfigured",
      authProtection: {
        provider: "turnstile",
        required: true,
        siteKey: null,
      },
    });
  });

  it("does not fall back to a build-time CAPTCHA key in a deployed environment", () => {
    expect(resolveBrowserConfiguration({
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "local-key",
      VITE_TURNSTILE_SITE_KEY: "local-only-key",
    }, {
      supabaseUrl: "https://production.supabase.co",
      supabasePublishableKey: "sb_publishable_production",
      environment: "production",
    }).authProtection).toEqual({
      provider: "turnstile",
      required: true,
      siteKey: null,
    });
  });
});
