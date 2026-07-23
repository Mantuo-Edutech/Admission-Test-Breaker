import {
  isValidProductionOrigin,
  isValidProductionVariable,
  type ProductionBootstrapRequirements,
} from "./production-bootstrap.js";

export const PRODUCTION_BOOTSTRAP_CONFIRMATION =
  "CONFIGURE_MANTUO_PRODUCTION_CONTROL_PLANE";

export interface ProductionBootstrapInputEnvironment {
  readonly name: "staging" | "production";
  readonly publicAppOrigin: string;
  readonly publicVariables?: Readonly<Record<string, string>>;
  readonly secretEnvironmentVariables: Readonly<Record<string, string>>;
  readonly requiredReviewerUsername?: string;
}

export interface ProductionBootstrapInput {
  readonly schemaVersion: 1;
  readonly repository: string;
  readonly environments: readonly ProductionBootstrapInputEnvironment[];
}

export type ProductionBootstrapPlanStep =
  | {
      readonly id: string;
      readonly kind: "ensure-environment";
      readonly environment: "staging" | "production";
      readonly description: string;
    }
  | {
      readonly id: string;
      readonly kind: "set-public-variable";
      readonly environment: "staging" | "production";
      readonly name: string;
      readonly value: string;
      readonly description: string;
    }
  | {
      readonly id: string;
      readonly kind: "set-secret-from-environment";
      readonly environment: "staging" | "production";
      readonly name: string;
      readonly sourceEnvironmentVariable: string;
      readonly description: string;
    }
  | {
      readonly id: string;
      readonly kind: "ensure-required-reviewer";
      readonly environment: "staging" | "production";
      readonly username: string;
      readonly minimumCount: number;
      readonly description: string;
    };

export interface ProductionBootstrapPlan {
  readonly schemaVersion: 1;
  readonly repository: string;
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly steps: readonly ProductionBootstrapPlanStep[];
  readonly secretSourceNames: readonly string[];
}

export interface ProductionBootstrapApplyAdapter {
  ensureEnvironment(
    repository: string,
    environment: "staging" | "production",
  ): Promise<void>;
  setPublicVariable(
    repository: string,
    environment: "staging" | "production",
    name: string,
    value: string,
  ): Promise<void>;
  setSecret(
    repository: string,
    environment: "staging" | "production",
    name: string,
    value: string,
  ): Promise<void>;
  ensureRequiredReviewer(
    repository: string,
    environment: "staging" | "production",
    username: string,
    minimumCount: number,
  ): Promise<void>;
}

export interface ProductionBootstrapApplyResult {
  readonly applied: boolean;
  readonly completedStepIds: readonly string[];
  readonly missingSecretSourceNames: readonly string[];
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function validEnvironmentVariableName(value: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/u.test(value);
}

export function buildProductionBootstrapPlan(
  requirements: ProductionBootstrapRequirements,
  input: ProductionBootstrapInput,
): ProductionBootstrapPlan {
  const issues: string[] = [];
  const steps: ProductionBootstrapPlanStep[] = [];

  if (input.schemaVersion !== 1) issues.push("配置 schemaVersion 必须为 1。");
  if (input.repository !== requirements.repository) {
    issues.push(`配置仓库必须为 ${requirements.repository}。`);
  }

  for (const duplicate of duplicateValues(input.environments.map((item) => item.name))) {
    issues.push(`环境 ${duplicate} 重复出现。`);
  }

  for (const requirement of requirements.environments) {
    const environment = input.environments.find((item) => item.name === requirement.name);
    if (environment === undefined) {
      issues.push(`缺少 ${requirement.name} 环境配置。`);
      continue;
    }
    if (!isValidProductionOrigin(environment.publicAppOrigin)) {
      issues.push(`${requirement.name} publicAppOrigin 必须是正式 HTTPS origin。`);
    }

    steps.push({
      id: `${requirement.name}-environment`,
      kind: "ensure-environment",
      environment: requirement.name,
      description: `确保 GitHub Environment ${requirement.name} 存在`,
    });

    for (const variable of requirement.requiredVariables) {
      const value = variable === "PUBLIC_APP_ORIGIN"
        ? environment.publicAppOrigin
        : environment.publicVariables?.[variable]?.trim() ?? "";
      if (!isValidProductionVariable(variable, value)) {
        issues.push(`${requirement.name} 公开变量 ${variable} 缺失或不合法。`);
        continue;
      }
      steps.push({
        id: `${requirement.name}-variable-${variable}`,
        kind: "set-public-variable",
        environment: requirement.name,
        name: variable,
        value,
        description: `设置 ${requirement.name} 公开变量 ${variable}`,
      });
    }

    for (const secret of requirement.requiredSecrets) {
      const source = environment.secretEnvironmentVariables[secret]?.trim() ?? "";
      if (!validEnvironmentVariableName(source)) {
        issues.push(
          `${requirement.name} secret ${secret} 必须映射到一个合法的本机环境变量名。`,
        );
        continue;
      }
      steps.push({
        id: `${requirement.name}-secret-${secret}`,
        kind: "set-secret-from-environment",
        environment: requirement.name,
        name: secret,
        sourceEnvironmentVariable: source,
        description: `从本机环境变量 ${source} 设置 ${requirement.name} secret ${secret}`,
      });
    }

    if (requirement.minimumRequiredReviewers > 0) {
      const username = environment.requiredReviewerUsername?.trim() ?? "";
      if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u.test(username)) {
        issues.push(`${requirement.name} 缺少合法的 GitHub required reviewer username。`);
      } else {
        steps.push({
          id: `${requirement.name}-required-reviewer`,
          kind: "ensure-required-reviewer",
          environment: requirement.name,
          username,
          minimumCount: requirement.minimumRequiredReviewers,
          description: `确保 ${requirement.name} 至少有 ${requirement.minimumRequiredReviewers} 名 required reviewer`,
        });
      }
    }
  }

  const configuredNames = new Set(input.environments.map((item) => item.name));
  for (const name of configuredNames) {
    if (!requirements.environments.some((item) => item.name === name)) {
      issues.push(`环境 ${name} 不在版本化 requirements 中。`);
    }
  }

  const secretSourceNames = [...new Set(steps.flatMap((step) =>
    step.kind === "set-secret-from-environment" ? [step.sourceEnvironmentVariable] : []))]
    .sort();

  return {
    schemaVersion: 1,
    repository: requirements.repository,
    valid: issues.length === 0,
    issues,
    steps,
    secretSourceNames,
  };
}

export async function applyProductionBootstrapPlan(
  plan: ProductionBootstrapPlan,
  confirmation: string | undefined,
  secretValues: Readonly<Record<string, string | undefined>>,
  adapter: ProductionBootstrapApplyAdapter,
): Promise<ProductionBootstrapApplyResult> {
  if (!plan.valid) throw new Error("生产 bootstrap 计划无效，禁止执行。\n" + plan.issues.join("\n"));
  if (confirmation !== PRODUCTION_BOOTSTRAP_CONFIRMATION) {
    throw new Error("缺少生产 bootstrap 显式确认，未执行任何外部写入。");
  }

  const missingSecretSourceNames = plan.secretSourceNames.filter((name) =>
    (secretValues[name] ?? "").trim() === "");
  if (missingSecretSourceNames.length > 0) {
    return { applied: false, completedStepIds: [], missingSecretSourceNames };
  }

  const completedStepIds: string[] = [];
  for (const step of plan.steps) {
    if (step.kind === "ensure-environment") {
      await adapter.ensureEnvironment(plan.repository, step.environment);
    } else if (step.kind === "set-public-variable") {
      await adapter.setPublicVariable(
        plan.repository,
        step.environment,
        step.name,
        step.value,
      );
    } else if (step.kind === "set-secret-from-environment") {
      await adapter.setSecret(
        plan.repository,
        step.environment,
        step.name,
        secretValues[step.sourceEnvironmentVariable]!,
      );
    } else {
      await adapter.ensureRequiredReviewer(
        plan.repository,
        step.environment,
        step.username,
        step.minimumCount,
      );
    }
    completedStepIds.push(step.id);
  }

  return { applied: true, completedStepIds, missingSecretSourceNames: [] };
}
