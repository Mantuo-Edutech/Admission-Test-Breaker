export interface ProductionEnvironmentRequirement {
  readonly name: "staging" | "production";
  readonly requiredSecrets: readonly string[];
  readonly requiredVariables: readonly string[];
  readonly minimumRequiredReviewers: number;
}

export interface ProductionBootstrapRequirements {
  readonly schemaVersion: 1;
  readonly policyVersion: string;
  readonly repository: string;
  readonly requiredWorkflowFiles: readonly string[];
  readonly environments: readonly ProductionEnvironmentRequirement[];
  readonly manualProductionGates: readonly {
    readonly id: string;
    readonly label: string;
  }[];
}

export interface GitHubEnvironmentSnapshot {
  readonly name: string;
  readonly exists: boolean;
  readonly secretNames: readonly string[];
  readonly variables: Readonly<Record<string, string>>;
  readonly requiredReviewerCount: number;
}

export interface ProductionBootstrapSnapshot {
  readonly repository: string | null;
  readonly githubAuthenticated: boolean;
  readonly githubScopes: readonly string[];
  readonly workflowFiles: Readonly<Record<string, boolean>>;
  readonly environments: readonly GitHubEnvironmentSnapshot[];
  readonly git: {
    readonly branch: string | null;
    readonly headSha: string | null;
    readonly clean: boolean;
    readonly pushedHeadMatches: boolean;
    readonly successfulVerifyRun: boolean;
  };
  readonly dockerAvailable: boolean;
}

export type BootstrapCheckStatus = "passed" | "failed" | "manual";

export interface ProductionBootstrapCheck {
  readonly id: string;
  readonly category: "repository" | "github-environment" | "release-candidate" | "manual-production";
  readonly status: BootstrapCheckStatus;
  readonly label: string;
  readonly action: string | null;
}

export interface ProductionBootstrapAssessment {
  readonly schemaVersion: 1;
  readonly policyVersion: string;
  readonly repository: string | null;
  readonly githubSetupReady: boolean;
  readonly releaseCandidateReady: boolean;
  readonly readyForBeta: false;
  readonly summary: {
    readonly passed: number;
    readonly failed: number;
    readonly manual: number;
  };
  readonly checks: readonly ProductionBootstrapCheck[];
}

function placeholder(value: string): boolean {
  return /example|replace|your[_-]?|localhost|127\.0\.0\.1/iu.test(value);
}

export function isValidProductionOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    const reservedHostname = [".example", ".invalid", ".local", ".localhost"]
      .some((suffix) => url.hostname.toLowerCase().endsWith(suffix));
    return url.protocol === "https:"
      && url.pathname === "/"
      && url.search === ""
      && url.hash === ""
      && !placeholder(value)
      && !reservedHostname;
  } catch {
    return false;
  }
}

function check(
  id: string,
  category: ProductionBootstrapCheck["category"],
  passed: boolean,
  label: string,
  action: string,
): ProductionBootstrapCheck {
  return { id, category, status: passed ? "passed" : "failed", label, action: passed ? null : action };
}

export function assessProductionBootstrap(
  requirements: ProductionBootstrapRequirements,
  snapshot: ProductionBootstrapSnapshot,
): ProductionBootstrapAssessment {
  const checks: ProductionBootstrapCheck[] = [];
  checks.push(check(
    "repository",
    "repository",
    snapshot.repository === requirements.repository,
    `GitHub 仓库为 ${requirements.repository}`,
    "确认 origin 指向满托组织的 Admission-Test-Breaker 仓库。",
  ));
  checks.push(check(
    "github-auth",
    "repository",
    snapshot.githubAuthenticated,
    "GitHub CLI 已登录",
    "运行 gh auth login，并使用具备 repo 与 workflow 权限的满托账号。",
  ));
  for (const scope of ["repo", "workflow"]) {
    checks.push(check(
      `github-scope-${scope}`,
      "repository",
      snapshot.githubScopes.includes(scope),
      `GitHub token 包含 ${scope} scope`,
      `运行 gh auth refresh -h github.com -s ${scope}。`,
    ));
  }
  for (const workflow of requirements.requiredWorkflowFiles) {
    checks.push(check(
      `workflow-${workflow}`,
      "repository",
      snapshot.workflowFiles[workflow] === true,
      `部署工作流存在：${workflow}`,
      `恢复或补齐 ${workflow}。`,
    ));
  }
  checks.push(check(
    "docker",
    "repository",
    snapshot.dockerAvailable,
    "本机可运行 Docker 容器验证",
    "安装并启动 Docker Desktop，再运行生产镜像验证。",
  ));

  for (const requirement of requirements.environments) {
    const environment = snapshot.environments.find((item) => item.name === requirement.name);
    const exists = environment?.exists === true;
    checks.push(check(
      `environment-${requirement.name}`,
      "github-environment",
      exists,
      `GitHub Environment：${requirement.name}`,
      `创建 GitHub Environment ${requirement.name}。`,
    ));
    for (const secret of requirement.requiredSecrets) {
      checks.push(check(
        `${requirement.name}-secret-${secret}`,
        "github-environment",
        exists && environment!.secretNames.includes(secret),
        `${requirement.name} secret：${secret}`,
        `运行 gh secret set --env ${requirement.name} ${secret}，在安全提示中输入值。`,
      ));
    }
    for (const variable of requirement.requiredVariables) {
      const value = environment?.variables[variable] ?? "";
      checks.push(check(
        `${requirement.name}-variable-${variable}`,
        "github-environment",
        exists && variable === "PUBLIC_APP_ORIGIN" && isValidProductionOrigin(value),
        `${requirement.name} variable：${variable} 为正式 HTTPS origin`,
        `运行 gh variable set --env ${requirement.name} ${variable} --body https://<该环境正式域名>/。`,
      ));
    }
    if (requirement.minimumRequiredReviewers > 0) {
      checks.push(check(
        `${requirement.name}-reviewers`,
        "github-environment",
        exists && (environment?.requiredReviewerCount ?? 0) >= requirement.minimumRequiredReviewers,
        `${requirement.name} 至少有 ${requirement.minimumRequiredReviewers} 名 required reviewer`,
        `为 ${requirement.name} Environment 指定至少 ${requirement.minimumRequiredReviewers} 名发布审批人。`,
      ));
    }
  }

  checks.push(check(
    "git-clean",
    "release-candidate",
    snapshot.git.clean,
    "发布候选工作树无未提交修改",
    "完成评审并提交当前改动；不要从脏工作树部署。",
  ));
  checks.push(check(
    "git-branch",
    "release-candidate",
    snapshot.git.branch === "main",
    "发布候选位于 main 分支",
    "通过 Pull Request 把已评审改动合并到 main，再从 main 生成发布候选。",
  ));
  checks.push(check(
    "git-pushed-head",
    "release-candidate",
    snapshot.git.headSha !== null && snapshot.git.pushedHeadMatches,
    "当前 commit 已推送到同名 origin 分支",
    "推送当前已评审 commit，并等待 GitHub Verify 全部通过。",
  ));
  checks.push(check(
    "git-verified-head",
    "release-candidate",
    snapshot.git.successfulVerifyRun,
    "当前 main commit 已有成功的 GitHub Verify 运行",
    "等待当前 main SHA 的 Verify workflow 全部通过；不要复用其他 commit 的绿灯。",
  ));

  for (const gate of requirements.manualProductionGates) {
    checks.push({
      id: gate.id,
      category: "manual-production",
      status: "manual",
      label: gate.label,
      action: "按生产运行手册完成并保存不含 secret 的证据。",
    });
  }

  const githubSetupReady = checks
    .filter((item) => item.category === "repository" || item.category === "github-environment")
    .every((item) => item.status === "passed");
  const releaseCandidateReady = githubSetupReady && checks
    .filter((item) => item.category === "release-candidate")
    .every((item) => item.status === "passed");
  const count = (status: BootstrapCheckStatus): number =>
    checks.filter((item) => item.status === status).length;

  return {
    schemaVersion: 1,
    policyVersion: requirements.policyVersion,
    repository: snapshot.repository,
    githubSetupReady,
    releaseCandidateReady,
    readyForBeta: false,
    summary: { passed: count("passed"), failed: count("failed"), manual: count("manual") },
    checks,
  };
}
