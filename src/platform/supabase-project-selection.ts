export const SUPABASE_PROJECT_ENVIRONMENTS = ["staging", "production"] as const;
export type SupabaseProjectEnvironment = (typeof SUPABASE_PROJECT_ENVIRONMENTS)[number];

export const SUPABASE_PROJECT_REGIONS = [
  "ap-east-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ca-central-1",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "sa-east-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
] as const;
export type SupabaseProjectRegion = (typeof SUPABASE_PROJECT_REGIONS)[number];

export interface SupabaseProjectInventoryItem {
  readonly ref: string;
  readonly name: string;
  readonly organizationId: string;
  readonly status: string;
  readonly createdAt?: string;
}

export type SupabaseProjectSelection =
  | {
      readonly name: SupabaseProjectEnvironment;
      readonly strategy: "create";
      readonly projectName: string;
      readonly region: SupabaseProjectRegion;
      readonly size: "nano";
    }
  | {
      readonly name: SupabaseProjectEnvironment;
      readonly strategy: "reuse";
      readonly projectRef: string;
    }
  | {
      readonly name: SupabaseProjectEnvironment;
      readonly strategy: "defer";
      readonly reason: string;
    };

export interface SupabaseProjectSelectionInput {
  readonly schemaVersion: 1;
  readonly organizationId: string;
  readonly environments: readonly SupabaseProjectSelection[];
}

export type SupabaseProjectSelectionStep =
  | {
      readonly environment: SupabaseProjectEnvironment;
      readonly kind: "create-project";
      readonly projectName: string;
      readonly region: SupabaseProjectRegion;
      readonly size: "nano";
      readonly description: string;
    }
  | {
      readonly environment: SupabaseProjectEnvironment;
      readonly kind: "reuse-project";
      readonly projectRef: string;
      readonly projectName: string;
      readonly description: string;
    }
  | {
      readonly environment: SupabaseProjectEnvironment;
      readonly kind: "defer-environment";
      readonly reason: string;
      readonly description: string;
    };

export interface SupabaseProjectSelectionPlan {
  readonly schemaVersion: 1;
  readonly organizationId: string;
  readonly valid: boolean;
  readonly complete: boolean;
  readonly readyForProvisioning: boolean;
  readonly requiresProjectCreationApproval: boolean;
  readonly requiresLegacyDataAudit: boolean;
  readonly issues: readonly string[];
  readonly warnings: readonly string[];
  readonly steps: readonly SupabaseProjectSelectionStep[];
}

function duplicates(values: readonly string[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function validOrganizationId(value: string): boolean {
  return /^[a-z0-9]{8,32}$/u.test(value);
}

function validProjectRef(value: string): boolean {
  return /^[a-z0-9]{20}$/u.test(value);
}

function validProjectName(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u.test(value);
}

function isRegion(value: string): value is SupabaseProjectRegion {
  return (SUPABASE_PROJECT_REGIONS as readonly string[]).includes(value);
}

function isEnvironment(value: unknown): value is SupabaseProjectEnvironment {
  return typeof value === "string"
    && (SUPABASE_PROJECT_ENVIRONMENTS as readonly string[]).includes(value);
}

function isStrategy(value: unknown): value is SupabaseProjectSelection["strategy"] {
  return value === "create" || value === "reuse" || value === "defer";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function environmentNames(
  environments: readonly SupabaseProjectSelection[],
): readonly string[] {
  return environments.map((item) => item.name);
}

export function buildSupabaseProjectSelectionPlan(
  inventory: readonly SupabaseProjectInventoryItem[],
  input: SupabaseProjectSelectionInput | unknown,
): SupabaseProjectSelectionPlan {
  const issues: string[] = [];
  const warnings: string[] = [];
  const steps: SupabaseProjectSelectionStep[] = [];
  const rawInput = isRecord(input) ? input : {};
  const organizationId = typeof rawInput.organizationId === "string"
    ? rawInput.organizationId
    : "";

  if (rawInput.schemaVersion !== 1) issues.push("配置 schemaVersion 必须为 1。");
  if (!validOrganizationId(organizationId)) {
    issues.push("organizationId 必须是明确的 Supabase organization ID，不能使用占位值。");
  }

  if (!Array.isArray(rawInput.environments)) {
    return {
      schemaVersion: 1,
      organizationId,
      valid: false,
      complete: false,
      readyForProvisioning: false,
      requiresProjectCreationApproval: false,
      requiresLegacyDataAudit: false,
      issues: [...issues, "environments 必须是数组。"],
      warnings: ["项目选择尚未覆盖 staging 与 production，不能进入生产配置执行层。"],
      steps: [],
    };
  }

  const rawEnvironments = rawInput.environments as readonly unknown[];
  const acceptedEnvironments = rawEnvironments.filter((selection, index) => {
    if (!isRecord(selection)) {
      issues.push(`environments[${index}] 必须是对象。`);
      return false;
    }
    if (!isEnvironment(selection.name)) {
      issues.push(`环境 ${String(selection.name)} 不在 staging/production 契约中。`);
      return false;
    }
    if (!isStrategy(selection.strategy)) {
      issues.push(`${selection.name} strategy 必须是 create、reuse 或 defer。`);
      return false;
    }
    return true;
  }) as unknown as readonly SupabaseProjectSelection[];

  for (const duplicate of duplicates(environmentNames(acceptedEnvironments))) {
    issues.push(`环境 ${duplicate} 重复出现。`);
  }

  for (const environmentName of SUPABASE_PROJECT_ENVIRONMENTS) {
    const selection = acceptedEnvironments.find((item) => item.name === environmentName);
    if (selection === undefined) {
      issues.push(`缺少 ${environmentName} Supabase 项目选择。`);
      continue;
    }

    if (selection.strategy === "create") {
      if (!validProjectName(selection.projectName)) {
        issues.push(`${environmentName} projectName 必须是 3-63 位小写字母、数字或连字符。`);
      }
      if (!isRegion(selection.region)) {
        issues.push(`${environmentName} region 不是受支持的 Supabase 区域。`);
      }
      if (selection.size !== "nano") {
        issues.push(`${environmentName} 初始项目只能计划 nano；扩容必须另行评审。`);
      }
      if (inventory.some((project) => project.name === selection.projectName)) {
        issues.push(`${environmentName} projectName 已存在；禁止用 create 产生同名或误判项目。`);
      }
      steps.push({
        environment: environmentName,
        kind: "create-project",
        projectName: selection.projectName,
        region: selection.region,
        size: selection.size,
        description: `计划新建独立 ${environmentName} 项目 ${selection.projectName}`,
      });
      continue;
    }

    if (selection.strategy === "reuse") {
      if (!validProjectRef(selection.projectRef)) {
        issues.push(`${environmentName} projectRef 格式无效。`);
        continue;
      }
      const project = inventory.find((item) => item.ref === selection.projectRef);
      if (project === undefined) {
        issues.push(`${environmentName} projectRef 不在当前 Supabase 账号的只读清单中。`);
        continue;
      }
      if (project.organizationId !== organizationId) {
        issues.push(`${environmentName} 项目不属于所选 organization。`);
      }
      if (project.status !== "ACTIVE_HEALTHY") {
        issues.push(
          `${environmentName} 项目 ${project.name} 当前状态为 ${project.status}；复用前必须单独恢复并完成历史数据审计。`,
        );
      }
      steps.push({
        environment: environmentName,
        kind: "reuse-project",
        projectRef: project.ref,
        projectName: project.name,
        description: `计划复用 ${environmentName} 项目 ${project.name}`,
      });
      warnings.push(`${environmentName} 复用现有项目必须完成人工历史数据与权限审计。`);
      continue;
    }

    const reason = typeof selection.reason === "string" ? selection.reason.trim() : "";
    if (reason.length < 10) issues.push(`${environmentName} defer 必须记录具体原因。`);
    steps.push({
      environment: environmentName,
      kind: "defer-environment",
      reason,
      description: `暂缓 ${environmentName} 项目：${reason}`,
    });
  }

  const projectIdentities = steps.flatMap((step) => {
    if (step.kind === "create-project") return [`name:${step.projectName}`];
    if (step.kind === "reuse-project") return [`ref:${step.projectRef}`];
    return [];
  });
  for (const duplicate of duplicates(projectIdentities)) {
    issues.push(`staging 与 production 不能指向同一 Supabase 项目（${duplicate}）。`);
  }

  const createNames = steps.flatMap((step) =>
    step.kind === "create-project" ? [step.projectName] : []);
  for (const duplicate of duplicates(createNames)) {
    issues.push(`staging 与 production 不能计划同名项目（${duplicate}）。`);
  }

  const complete = steps.length === 2
    && steps.every((step) => step.kind !== "defer-environment");
  const requiresProjectCreationApproval = steps.some((step) => step.kind === "create-project");
  const requiresLegacyDataAudit = steps.some((step) => step.kind === "reuse-project");
  if (requiresProjectCreationApproval) {
    warnings.push("创建 Supabase 项目可能产生费用；执行层必须在动作发生前再次获得明确批准。");
  }
  if (!complete) warnings.push("项目选择尚未覆盖 staging 与 production，不能进入生产配置执行层。");

  const valid = issues.length === 0;
  return {
    schemaVersion: 1,
    organizationId,
    valid,
    complete,
    readyForProvisioning: valid && complete,
    requiresProjectCreationApproval,
    requiresLegacyDataAudit,
    issues,
    warnings: [...new Set(warnings)],
    steps,
  };
}
