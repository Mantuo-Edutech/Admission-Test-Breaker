import { describe, expect, it, vi } from "vitest";
import {
  applyProductionBootstrapPlan,
  buildProductionBootstrapPlan,
  PRODUCTION_BOOTSTRAP_CONFIRMATION,
  type ProductionBootstrapApplyAdapter,
  type ProductionBootstrapInput,
} from "../../src/platform/production-bootstrap-plan.js";
import type { ProductionBootstrapRequirements } from "../../src/platform/production-bootstrap.js";

const requirements: ProductionBootstrapRequirements = {
  schemaVersion: 1,
  policyVersion: "1.0.0",
  repository: "Mantuo-Edutech/Admission-Test-Breaker",
  requiredWorkflowFiles: [],
  environments: [
    {
      name: "staging",
      requiredSecrets: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"],
      requiredVariables: ["PUBLIC_APP_ORIGIN"],
      minimumRequiredReviewers: 0,
    },
    {
      name: "production",
      requiredSecrets: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"],
      requiredVariables: ["PUBLIC_APP_ORIGIN"],
      minimumRequiredReviewers: 1,
    },
  ],
  manualProductionGates: [],
};

function completeInput(): ProductionBootstrapInput {
  return {
    schemaVersion: 1,
    repository: requirements.repository,
    environments: [
      {
        name: "staging",
        publicAppOrigin: "https://staging.admission.mantuo.cn/",
        secretEnvironmentVariables: {
          SUPABASE_ACCESS_TOKEN: "MANTUO_STAGING_ACCESS_TOKEN",
          SUPABASE_PROJECT_REF: "MANTUO_STAGING_PROJECT_REF",
        },
      },
      {
        name: "production",
        publicAppOrigin: "https://admission.mantuo.cn/",
        secretEnvironmentVariables: {
          SUPABASE_ACCESS_TOKEN: "MANTUO_PRODUCTION_ACCESS_TOKEN",
          SUPABASE_PROJECT_REF: "MANTUO_PRODUCTION_PROJECT_REF",
        },
        requiredReviewerUsername: "mantuo-founder",
      },
    ],
  };
}

function fakeAdapter(): ProductionBootstrapApplyAdapter & {
  ensureEnvironment: ReturnType<typeof vi.fn>;
  setPublicVariable: ReturnType<typeof vi.fn>;
  setSecret: ReturnType<typeof vi.fn>;
  ensureRequiredReviewer: ReturnType<typeof vi.fn>;
} {
  return {
    ensureEnvironment: vi.fn().mockResolvedValue(undefined),
    setPublicVariable: vi.fn().mockResolvedValue(undefined),
    setSecret: vi.fn().mockResolvedValue(undefined),
    ensureRequiredReviewer: vi.fn().mockResolvedValue(undefined),
  };
}

describe("production bootstrap plan", () => {
  it("builds a complete plan that stores only secret source names", () => {
    const plan = buildProductionBootstrapPlan(requirements, completeInput());

    expect(plan.valid).toBe(true);
    expect(plan.steps).toHaveLength(9);
    expect(plan.secretSourceNames).toEqual([
      "MANTUO_PRODUCTION_ACCESS_TOKEN",
      "MANTUO_PRODUCTION_PROJECT_REF",
      "MANTUO_STAGING_ACCESS_TOKEN",
      "MANTUO_STAGING_PROJECT_REF",
    ]);
    expect(JSON.stringify(plan)).not.toContain("actual-secret-value");
  });

  it("rejects placeholder origins, duplicate environments and absent reviewers", () => {
    const input = completeInput();
    const plan = buildProductionBootstrapPlan(requirements, {
      ...input,
      environments: [
        { ...input.environments[0]!, publicAppOrigin: "https://replace.invalid/" },
        { ...input.environments[0]! },
        { ...input.environments[1]!, requiredReviewerUsername: "" },
      ],
    });

    expect(plan.valid).toBe(false);
    expect(plan.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("重复"),
      expect.stringContaining("正式 HTTPS origin"),
      expect.stringContaining("required reviewer"),
    ]));
  });

  it("performs zero writes when confirmation is absent", async () => {
    const plan = buildProductionBootstrapPlan(requirements, completeInput());
    const adapter = fakeAdapter();
    const secrets = Object.fromEntries(plan.secretSourceNames.map((name) => [name, "value"]));

    await expect(applyProductionBootstrapPlan(plan, undefined, secrets, adapter))
      .rejects.toThrow("显式确认");
    expect(adapter.ensureEnvironment).not.toHaveBeenCalled();
    expect(adapter.setSecret).not.toHaveBeenCalled();
  });

  it("performs zero writes when any secret source is missing", async () => {
    const plan = buildProductionBootstrapPlan(requirements, completeInput());
    const adapter = fakeAdapter();
    const result = await applyProductionBootstrapPlan(
      plan,
      PRODUCTION_BOOTSTRAP_CONFIRMATION,
      { MANTUO_STAGING_ACCESS_TOKEN: "only-one-value" },
      adapter,
    );

    expect(result.applied).toBe(false);
    expect(result.completedStepIds).toEqual([]);
    expect(result.missingSecretSourceNames).toHaveLength(3);
    expect(adapter.ensureEnvironment).not.toHaveBeenCalled();
    expect(adapter.setPublicVariable).not.toHaveBeenCalled();
    expect(adapter.setSecret).not.toHaveBeenCalled();
  });

  it("applies every validated step and passes secrets only to the secret adapter", async () => {
    const plan = buildProductionBootstrapPlan(requirements, completeInput());
    const adapter = fakeAdapter();
    const secrets = Object.fromEntries(
      plan.secretSourceNames.map((name, index) => [name, `actual-secret-value-${index}`]),
    );
    const result = await applyProductionBootstrapPlan(
      plan,
      PRODUCTION_BOOTSTRAP_CONFIRMATION,
      secrets,
      adapter,
    );

    expect(result.applied).toBe(true);
    expect(result.completedStepIds).toHaveLength(plan.steps.length);
    expect(adapter.ensureEnvironment).toHaveBeenCalledTimes(2);
    expect(adapter.setPublicVariable).toHaveBeenCalledTimes(2);
    expect(adapter.setSecret).toHaveBeenCalledTimes(4);
    expect(adapter.ensureRequiredReviewer).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(adapter.ensureEnvironment.mock.calls)).not.toContain("actual-secret-value");
    expect(JSON.stringify(adapter.setPublicVariable.mock.calls)).not.toContain("actual-secret-value");
    expect(JSON.stringify(adapter.ensureRequiredReviewer.mock.calls)).not.toContain("actual-secret-value");
  });

  it("stops immediately after an external write failure", async () => {
    const plan = buildProductionBootstrapPlan(requirements, completeInput());
    const adapter = fakeAdapter();
    adapter.setPublicVariable.mockRejectedValueOnce(new Error("github unavailable"));
    const secrets = Object.fromEntries(plan.secretSourceNames.map((name) => [name, "value"]));

    await expect(applyProductionBootstrapPlan(
      plan,
      PRODUCTION_BOOTSTRAP_CONFIRMATION,
      secrets,
      adapter,
    )).rejects.toThrow("github unavailable");
    expect(adapter.ensureEnvironment).toHaveBeenCalledTimes(1);
    expect(adapter.setPublicVariable).toHaveBeenCalledTimes(1);
    expect(adapter.setSecret).not.toHaveBeenCalled();
  });
});
