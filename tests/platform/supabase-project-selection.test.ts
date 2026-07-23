import { describe, expect, it } from "vitest";
import {
  buildSupabaseProjectSelectionPlan,
  type SupabaseProjectInventoryItem,
  type SupabaseProjectSelectionInput,
} from "../../src/platform/supabase-project-selection.js";

const organizationId = "askyvjririybgkusbgwz";
const inventory: readonly SupabaseProjectInventoryItem[] = [
  {
    ref: "xdpuexjpnxidwvaruslz",
    name: "legacy-project",
    organizationId,
    status: "INACTIVE",
  },
  {
    ref: "abcdefghijklmnopqrst",
    name: "healthy-project",
    organizationId,
    status: "ACTIVE_HEALTHY",
  },
];

function createBoth(): SupabaseProjectSelectionInput {
  return {
    schemaVersion: 1,
    organizationId,
    environments: [
      {
        name: "staging",
        strategy: "create",
        projectName: "mantuo-admission-staging",
        region: "ap-northeast-1",
        size: "nano",
      },
      {
        name: "production",
        strategy: "create",
        projectName: "mantuo-admission-production",
        region: "ap-northeast-1",
        size: "nano",
      },
    ],
  };
}

describe("Supabase project selection plan", () => {
  it("plans two distinct dedicated projects without performing provisioning", () => {
    const plan = buildSupabaseProjectSelectionPlan(inventory, createBoth());

    expect(plan.valid).toBe(true);
    expect(plan.complete).toBe(true);
    expect(plan.readyForProvisioning).toBe(true);
    expect(plan.requiresProjectCreationApproval).toBe(true);
    expect(plan.requiresLegacyDataAudit).toBe(false);
    expect(plan.steps.map((step) => step.kind)).toEqual([
      "create-project",
      "create-project",
    ]);
    expect(plan.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("可能产生费用"),
    ]));
  });

  it("rejects a dormant legacy project until reactivation and data audit", () => {
    const input: SupabaseProjectSelectionInput = {
      ...createBoth(),
      environments: [
        { name: "staging", strategy: "reuse", projectRef: "xdpuexjpnxidwvaruslz" },
        createBoth().environments[1]!,
      ],
    };
    const plan = buildSupabaseProjectSelectionPlan(inventory, input);

    expect(plan.valid).toBe(false);
    expect(plan.requiresLegacyDataAudit).toBe(true);
    expect(plan.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("INACTIVE"),
      expect.stringContaining("历史数据审计"),
    ]));
  });

  it("rejects cross-organization, missing and duplicate project selections", () => {
    const input: SupabaseProjectSelectionInput = {
      schemaVersion: 1,
      organizationId: "otherorg12345678",
      environments: [
        { name: "staging", strategy: "reuse", projectRef: "abcdefghijklmnopqrst" },
        { name: "production", strategy: "reuse", projectRef: "abcdefghijklmnopqrst" },
      ],
    };
    const plan = buildSupabaseProjectSelectionPlan(inventory, input);

    expect(plan.valid).toBe(false);
    expect(plan.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("不属于所选 organization"),
      expect.stringContaining("不能指向同一 Supabase 项目"),
    ]));
  });

  it("supports a staging-only plan while refusing production provisioning", () => {
    const input: SupabaseProjectSelectionInput = {
      ...createBoth(),
      environments: [
        createBoth().environments[0]!,
        {
          name: "production",
          strategy: "defer",
          reason: "先完成 staging 全链路和真实邮件验收",
        },
      ],
    };
    const plan = buildSupabaseProjectSelectionPlan(inventory, input);

    expect(plan.valid).toBe(true);
    expect(plan.complete).toBe(false);
    expect(plan.readyForProvisioning).toBe(false);
    expect(plan.steps[1]?.kind).toBe("defer-environment");
  });

  it("rejects placeholders, duplicate environment entries and existing create names", () => {
    const input = createBoth();
    const plan = buildSupabaseProjectSelectionPlan(inventory, {
      ...input,
      organizationId: "replace-with-approved-supabase-org-id",
      environments: [
        {
          ...input.environments[0]!,
          projectName: "legacy-project",
        },
        input.environments[0]!,
      ],
    } as SupabaseProjectSelectionInput);

    expect(plan.valid).toBe(false);
    expect(plan.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("organizationId"),
      expect.stringContaining("重复出现"),
      expect.stringContaining("projectName 已存在"),
    ]));
  });

  it("fails closed for malformed environment arrays and unknown strategies", () => {
    const malformed = buildSupabaseProjectSelectionPlan(inventory, {
      ...createBoth(),
      environments: undefined,
    } as unknown as SupabaseProjectSelectionInput);
    const unknownStrategy = buildSupabaseProjectSelectionPlan(inventory, {
      ...createBoth(),
      environments: [
        { name: "staging", strategy: "overwrite" },
        createBoth().environments[1],
      ],
    } as unknown as SupabaseProjectSelectionInput);
    const nullItem = buildSupabaseProjectSelectionPlan(inventory, {
      ...createBoth(),
      environments: [null, createBoth().environments[1]],
    });
    const nullDocument = buildSupabaseProjectSelectionPlan(inventory, null);

    expect(malformed.valid).toBe(false);
    expect(malformed.issues).toContain("environments 必须是数组。");
    expect(unknownStrategy.valid).toBe(false);
    expect(unknownStrategy.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("strategy 必须是 create、reuse 或 defer"),
      expect.stringContaining("缺少 staging"),
    ]));
    expect(nullItem.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("environments[0] 必须是对象"),
      expect.stringContaining("缺少 staging"),
    ]));
    expect(nullDocument.valid).toBe(false);
    expect(nullDocument.issues).toEqual(expect.arrayContaining([
      "配置 schemaVersion 必须为 1。",
      "organizationId 必须是明确的 Supabase organization ID，不能使用占位值。",
      "environments 必须是数组。",
    ]));
  });
});
