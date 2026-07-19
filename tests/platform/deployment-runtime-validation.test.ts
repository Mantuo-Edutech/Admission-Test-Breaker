import { describe, expect, it } from "vitest";
import {
  assertDeployedBrowserRuntime,
  parseDeployedBrowserRuntime,
} from "../../scripts/verify-deployment.js";

function runtimeSource(overrides: Partial<Record<string, string>> = {}): string {
  const values = {
    supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
    supabasePublishableKey: "sb_publishable_production_key_value",
    turnstileSiteKey: "turnstile-production-site-key",
    release: "sha-123",
    environment: "production",
    ...overrides,
  };
  return `window.__MANTUO_RUNTIME_CONFIG__ = ${JSON.stringify(values)};`;
}

describe("deployed browser runtime validation", () => {
  it("parses and accepts a complete immutable production identity", () => {
    const runtime = parseDeployedBrowserRuntime(runtimeSource());
    expect(runtime).toMatchObject({
      environment: "production",
      release: "sha-123",
      turnstileSiteKey: "turnstile-production-site-key",
    });
    expect(() => assertDeployedBrowserRuntime(
      runtime,
      "production",
      "sha-123",
      "abcdefghijklmnopqrst",
    )).not.toThrow();
  });

  it("rejects empty, placeholder, malformed and wrong-project production values", () => {
    expect(() => assertDeployedBrowserRuntime(
      parseDeployedBrowserRuntime(runtimeSource({ turnstileSiteKey: "" })),
    )).toThrow("Turnstile");
    expect(() => assertDeployedBrowserRuntime(
      parseDeployedBrowserRuntime(runtimeSource({
        supabasePublishableKey: "sb_publishable_replace_me",
      })),
    )).toThrow("publishable key");
    expect(() => assertDeployedBrowserRuntime(
      parseDeployedBrowserRuntime(runtimeSource()),
      "production",
      "sha-123",
      "differentprojectref",
    )).toThrow("Expected Supabase project");
  });

  it("keeps CI and local runtime validation offline-compatible", () => {
    const runtime = parseDeployedBrowserRuntime(runtimeSource({
      environment: "ci",
      supabaseUrl: "https://ci.supabase.co",
      supabasePublishableKey: "sb_publishable_ci_only",
      turnstileSiteKey: "",
    }));
    expect(() => assertDeployedBrowserRuntime(runtime, "ci", "sha-123")).not.toThrow();
  });
});
