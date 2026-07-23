import { describe, expect, it } from "vitest";
import {
  buildTurnstileBootstrapPlan,
  reconcileTurnstileWidget,
  turnstileDomainCollisions,
  turnstileWidgetIsReady,
  type TurnstileBootstrapInput,
} from "../../src/platform/turnstile-bootstrap.js";

function completeInput(): TurnstileBootstrapInput {
  return {
    schemaVersion: 1,
    repository: "Mantuo-Edutech/Admission-Test-Breaker",
    accountIdEnvironmentVariable: "MANTUO_CLOUDFLARE_ACCOUNT_ID",
    apiTokenEnvironmentVariable: "MANTUO_CLOUDFLARE_TURNSTILE_API_TOKEN",
    widgets: [
      { environment: "staging", name: "Mantuo UK Test staging", domains: ["staging.uktest.cc"] },
      { environment: "production", name: "Mantuo UK Test production", domains: ["www.uktest.cc", "uktest.cc"] },
    ],
  };
}

describe("Turnstile bootstrap plan", () => {
  it("builds exactly one managed, world-region widget per environment", () => {
    const plan = buildTurnstileBootstrapPlan(completeInput());
    expect(plan.valid).toBe(true);
    expect(plan.widgets).toEqual([
      {
        environment: "staging",
        name: "Mantuo UK Test staging",
        domains: ["staging.uktest.cc"],
        mode: "managed",
        region: "world",
      },
      {
        environment: "production",
        name: "Mantuo UK Test production",
        domains: ["uktest.cc", "www.uktest.cc"],
        mode: "managed",
        region: "world",
      },
    ]);
  });

  it("rejects placeholder, URL, IP, duplicate and cross-environment hostnames", () => {
    const input = completeInput();
    const plan = buildTurnstileBootstrapPlan({
      ...input,
      widgets: [
        { environment: "staging", name: "same", domains: ["https://staging.uktest.cc", "127.0.0.1"] },
        { environment: "production", name: "same", domains: ["staging.uktest.cc", "staging.uktest.cc"] },
      ],
    });
    expect(plan.valid).toBe(false);
    expect(plan.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("正式 hostname"),
      expect.stringContaining("不得重复"),
      expect.stringContaining("widget name"),
    ]));

    const missing = buildTurnstileBootstrapPlan({ ...input, widgets: [input.widgets[0]!] });
    expect(missing.valid).toBe(false);
    expect(missing.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("production 必须且只能"),
    ]));
  });

  it("reconciles create, reuse and mutable updates without rotating a secret", () => {
    const desired = buildTurnstileBootstrapPlan(completeInput()).widgets[0]!;
    expect(reconcileTurnstileWidget(desired, [])).toMatchObject({ action: "create" });
    const exact = {
      name: desired.name,
      domains: desired.domains,
      mode: desired.mode,
      region: desired.region,
      sitekey: "0x4AAAAAAABBBBBBBBCCCCCCCC",
      secret: "managed-cloudflare-secret-value",
    };
    expect(reconcileTurnstileWidget(desired, [exact])).toMatchObject({ action: "reuse" });
    expect(turnstileWidgetIsReady(exact, desired)).toBe(true);
    expect(reconcileTurnstileWidget(desired, [{ ...exact, domains: ["wrong.uktest.cc"] }]))
      .toMatchObject({ action: "update" });
    expect(turnstileWidgetIsReady({ ...exact, secret: undefined }, desired)).toBe(false);
  });

  it("fails closed for duplicate names or an immutable wrong region", () => {
    const desired = buildTurnstileBootstrapPlan(completeInput()).widgets[0]!;
    const current = {
      name: desired.name,
      domains: desired.domains,
      mode: desired.mode,
      region: desired.region,
      sitekey: "0x4AAAAAAABBBBBBBBCCCCCCCC",
      secret: "managed-cloudflare-secret-value",
    };
    expect(() => reconcileTurnstileWidget(desired, [current, current])).toThrow("duplicate widgets");
    expect(() => reconcileTurnstileWidget(desired, [{ ...current, region: "eu" }]))
      .toThrow("immutable region");
    expect(turnstileDomainCollisions(desired, [
      { ...current, name: "legacy staging widget" },
      { ...current, name: "unrelated widget", domains: ["other.uktest.cc"] },
    ])).toEqual([{ ...current, name: "legacy staging widget" }]);
  });
});
