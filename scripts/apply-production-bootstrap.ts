import { execFile as execFileCallback, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  applyProductionBootstrapPlan,
  buildProductionBootstrapPlan,
  PRODUCTION_BOOTSTRAP_CONFIRMATION,
  type ProductionBootstrapApplyAdapter,
  type ProductionBootstrapInput,
} from "../src/platform/production-bootstrap-plan.js";
import type { ProductionBootstrapRequirements } from "../src/platform/production-bootstrap.js";

const execFile = promisify(execFileCallback);

interface CommandResult {
  readonly ok: boolean;
  readonly stdout: string;
}

async function command(program: string, args: readonly string[]): Promise<CommandResult> {
  try {
    const result = await execFile(program, [...args], { encoding: "utf8", timeout: 30_000 });
    return { ok: true, stdout: result.stdout };
  } catch {
    return { ok: false, stdout: "" };
  }
}

async function requireCommand(program: string, args: readonly string[], label: string): Promise<string> {
  const result = await command(program, args);
  if (!result.ok) throw new Error(`${label}失败；未输出可能包含敏感信息的命令详情。`);
  return result.stdout;
}

async function commandWithSecretStdin(
  program: string,
  args: readonly string[],
  secret: string,
  label: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(program, [...args], { stdio: ["pipe", "ignore", "ignore"] });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${label}超时；未输出 secret。`));
    }, 30_000);
    child.once("error", () => {
      clearTimeout(timer);
      reject(new Error(`${label}失败；未输出 secret。`));
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${label}失败；未输出 secret。`));
    });
    child.stdin.end(`${secret}\n`);
  });
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

interface EnvironmentApiResponse {
  readonly protection_rules?: readonly {
    readonly type?: unknown;
    readonly wait_timer?: unknown;
    readonly prevent_self_review?: unknown;
    readonly reviewers?: readonly {
      readonly type?: unknown;
      readonly reviewer?: { readonly id?: unknown };
    }[];
  }[];
  readonly deployment_branch_policy?: unknown;
}

async function readEnvironment(
  repository: string,
  environment: "staging" | "production",
): Promise<EnvironmentApiResponse | null> {
  const result = await command("gh", ["api", `repos/${repository}/environments/${environment}`]);
  if (!result.ok) return null;
  try {
    return JSON.parse(result.stdout) as EnvironmentApiResponse;
  } catch {
    throw new Error(`GitHub Environment ${environment} 返回无法解析的响应。`);
  }
}

function currentReviewers(
  environment: EnvironmentApiResponse,
): readonly { type: "User" | "Team"; id: number }[] {
  const rule = environment.protection_rules?.find((item) => item.type === "required_reviewers");
  return (rule?.reviewers ?? []).flatMap((item) => {
    const type = item.type;
    const id = item.reviewer?.id;
    return (type === "User" || type === "Team") && typeof id === "number"
      ? [{ type, id }]
      : [];
  });
}

const adapter: ProductionBootstrapApplyAdapter = {
  async ensureEnvironment(repository, environment) {
    if (await readEnvironment(repository, environment) !== null) return;
    await requireCommand(
      "gh",
      ["api", "--method", "PUT", `repos/${repository}/environments/${environment}`],
      `创建 GitHub Environment ${environment}`,
    );
  },

  async setPublicVariable(repository, environment, name, value) {
    await requireCommand(
      "gh",
      ["variable", "set", "--repo", repository, "--env", environment, name, "--body", value],
      `设置 ${environment} variable ${name}`,
    );
  },

  async setSecret(repository, environment, name, value) {
    await commandWithSecretStdin(
      "gh",
      ["secret", "set", "--repo", repository, "--env", environment, name],
      value,
      `设置 ${environment} secret ${name}`,
    );
  },

  async ensureRequiredReviewer(repository, environment, username, minimumCount) {
    const current = await readEnvironment(repository, environment);
    if (current === null) throw new Error(`GitHub Environment ${environment} 不存在。`);
    const reviewers = currentReviewers(current);
    if (reviewers.length >= minimumCount) return;

    const userIdText = await requireCommand(
      "gh",
      ["api", `users/${username}`, "--jq", ".id"],
      `解析 GitHub reviewer ${username}`,
    );
    const userId = Number(userIdText.trim());
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new Error(`GitHub reviewer ${username} 没有返回合法用户 ID。`);
    }
    const merged = [...reviewers];
    if (!merged.some((item) => item.type === "User" && item.id === userId)) {
      merged.push({ type: "User", id: userId });
    }
    if (merged.length < minimumCount) {
      throw new Error(`${environment} 仍不足 ${minimumCount} 名 required reviewer。`);
    }

    const requiredRule = current.protection_rules?.find((item) =>
      item.type === "required_reviewers");
    const waitRule = current.protection_rules?.find((item) => item.type === "wait_timer");
    const body = JSON.stringify({
      wait_timer: typeof waitRule?.wait_timer === "number" ? waitRule.wait_timer : 0,
      prevent_self_review: requiredRule?.prevent_self_review !== false,
      reviewers: merged,
      deployment_branch_policy: current.deployment_branch_policy ?? null,
    });
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "gh",
        [
          "api",
          "--method",
          "PUT",
          `repos/${repository}/environments/${environment}`,
          "--input",
          "-",
        ],
        { stdio: ["pipe", "ignore", "ignore"] },
      );
      child.once("error", () => reject(new Error(`配置 ${environment} required reviewer 失败。`)));
      child.once("exit", (code) => code === 0
        ? resolve()
        : reject(new Error(`配置 ${environment} required reviewer 失败。`)));
      child.stdin.end(body);
    });
  },
};

const configPath = argument("--config");
if (configPath === undefined) {
  console.error("缺少 --config <path>；复制 deploy/bootstrap-input.example.json 到不进 Git 的 local 文件后填写公开配置。");
  process.exit(1);
}

const requirements = JSON.parse(
  await readFile("deploy/bootstrap-requirements.json", "utf8"),
) as ProductionBootstrapRequirements;
const input = JSON.parse(await readFile(configPath, "utf8")) as ProductionBootstrapInput;
const plan = buildProductionBootstrapPlan(requirements, input);
const apply = process.argv.includes("--apply");

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ...plan, mode: apply ? "apply" : "dry-run" }, null, 2));
} else {
  console.log(`Production bootstrap plan: ${plan.valid ? "valid" : "invalid"}`);
  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);
  for (const issue of plan.issues) console.log(`- [INVALID] ${issue}`);
  for (const step of plan.steps) console.log(`- [PLAN] ${step.description}`);
  console.log("Secret values are not stored in the config or shown in this plan.");
}

if (!plan.valid) process.exit(1);
if (!apply) process.exit(0);

const auth = await command("gh", ["auth", "status", "-h", "github.com"]);
if (!auth.ok) throw new Error("GitHub CLI 未登录；未执行任何外部写入。");

const secretValues = Object.fromEntries(
  plan.secretSourceNames.map((name) => [name, process.env[name]]),
);
const result = await applyProductionBootstrapPlan(
  plan,
  argument("--confirm"),
  secretValues,
  adapter,
);
if (!result.applied) {
  console.error(`缺少本机 secret 环境变量：${result.missingSecretSourceNames.join(", ")}`);
  console.error("未执行任何外部写入。");
  process.exit(1);
}

console.log(`Applied ${result.completedStepIds.length} production bootstrap steps without printing secret values.`);
console.log("Running the independent read-only production bootstrap gate...");
const verification = await command("pnpm", ["production:bootstrap-gate"]);
if (!verification.ok) {
  throw new Error("独立只读 production bootstrap gate 未通过；请运行 pnpm production:preflight 查看非敏感差异。");
}
console.log("Production GitHub control-plane setup verified. Manual Beta gates still remain.");
console.log(`Confirmation used: ${PRODUCTION_BOOTSTRAP_CONFIRMATION}`);
