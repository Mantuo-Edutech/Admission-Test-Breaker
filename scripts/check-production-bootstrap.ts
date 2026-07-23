import { execFile as execFileCallback } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  assessProductionBootstrap,
  type GitHubProtectedBranchSnapshot,
  type GitHubEnvironmentSnapshot,
  type ProductionBootstrapRequirements,
  type ProductionBootstrapSnapshot,
} from "../src/platform/production-bootstrap.js";

const execFile = promisify(execFileCallback);

interface CommandResult {
  readonly ok: boolean;
  readonly stdout: string;
  readonly stderr: string;
}

async function command(program: string, args: readonly string[]): Promise<CommandResult> {
  try {
    const result = await execFile(program, [...args], { encoding: "utf8", timeout: 15_000 });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const value = error as { stdout?: string; stderr?: string };
    return { ok: false, stdout: value.stdout ?? "", stderr: value.stderr ?? "" };
  }
}

function repositoryFromRemote(value: string): string | null {
  const match = value.trim().match(
    /github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/iu,
  );
  return match?.[1] !== undefined && match[2] !== undefined
    ? `${match[1]}/${match[2]}`
    : null;
}

function scopesFromStatus(value: string): readonly string[] {
  const line = value.split("\n").find((item) => /Token scopes:/iu.test(item));
  if (line === undefined) return [];
  return [...new Set(
    [...line.matchAll(/'([^']+)'/gu)].map((match) => match[1]!).filter(Boolean),
  )].sort();
}

async function githubEnvironment(
  repository: string,
  name: "staging" | "production",
): Promise<GitHubEnvironmentSnapshot> {
  const environment = await command("gh", ["api", `repos/${repository}/environments/${name}`]);
  if (!environment.ok) {
    return { name, exists: false, secretNames: [], variables: {}, requiredReviewerCount: 0 };
  }
  const raw = JSON.parse(environment.stdout) as {
    protection_rules?: readonly { type?: unknown; reviewers?: unknown }[];
  };
  const requiredReviewers = raw.protection_rules?.find((rule) =>
    rule.type === "required_reviewers")?.reviewers;
  const requiredReviewerCount = Array.isArray(requiredReviewers) ? requiredReviewers.length : 0;
  const [secretResponse, variableResponse] = await Promise.all([
    command("gh", ["api", `repos/${repository}/environments/${name}/secrets`]),
    command("gh", ["api", `repos/${repository}/environments/${name}/variables`]),
  ]);
  const secretBody = secretResponse.ok
    ? JSON.parse(secretResponse.stdout) as { secrets?: readonly { name?: unknown }[] }
    : {};
  const variableBody = variableResponse.ok
    ? JSON.parse(variableResponse.stdout) as { variables?: readonly { name?: unknown; value?: unknown }[] }
    : {};
  const secretNames = (secretBody.secrets ?? [])
    .flatMap((secret) => typeof secret.name === "string" ? [secret.name] : [])
    .sort();
  const variables = Object.fromEntries((variableBody.variables ?? []).flatMap((variable) =>
    typeof variable.name === "string" && typeof variable.value === "string"
      ? [[variable.name, variable.value] as const]
      : []));
  return { name, exists: true, secretNames, variables, requiredReviewerCount };
}

async function githubBranchProtection(
  repository: string,
  name: "main",
): Promise<GitHubProtectedBranchSnapshot> {
  const response = await command("gh", [
    "api",
    `repos/${repository}/branches/${name}/protection`,
  ]);
  if (!response.ok) {
    return {
      name,
      exists: false,
      requiredStatusChecks: [],
      requireBranchesUpToDate: false,
      enforceAdmins: false,
      requirePullRequest: false,
      requiredApprovingReviewCount: 0,
      requireConversationResolution: false,
      allowForcePushes: false,
      allowDeletions: false,
    };
  }
  const raw = JSON.parse(response.stdout) as {
    required_status_checks?: { strict?: unknown; contexts?: unknown };
    enforce_admins?: { enabled?: unknown };
    required_pull_request_reviews?: { required_approving_review_count?: unknown };
    required_conversation_resolution?: { enabled?: unknown };
    allow_force_pushes?: { enabled?: unknown };
    allow_deletions?: { enabled?: unknown };
  };
  const contexts = raw.required_status_checks?.contexts;
  return {
    name,
    exists: true,
    requiredStatusChecks: Array.isArray(contexts)
      ? contexts.filter((item): item is string => typeof item === "string").sort()
      : [],
    requireBranchesUpToDate: raw.required_status_checks?.strict === true,
    enforceAdmins: raw.enforce_admins?.enabled === true,
    requirePullRequest: raw.required_pull_request_reviews !== undefined,
    requiredApprovingReviewCount:
      typeof raw.required_pull_request_reviews?.required_approving_review_count === "number"
        ? raw.required_pull_request_reviews.required_approving_review_count
        : 0,
    requireConversationResolution: raw.required_conversation_resolution?.enabled === true,
    allowForcePushes: raw.allow_force_pushes?.enabled === true,
    allowDeletions: raw.allow_deletions?.enabled === true,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function snapshot(requirements: ProductionBootstrapRequirements): Promise<ProductionBootstrapSnapshot> {
  const [remote, auth, branch, head, status, docker] = await Promise.all([
    command("git", ["remote", "get-url", "origin"]),
    command("gh", ["auth", "status", "-h", "github.com"]),
    command("git", ["branch", "--show-current"]),
    command("git", ["rev-parse", "HEAD"]),
    command("git", ["status", "--porcelain"]),
    command("docker", ["info", "--format", "{{.ServerVersion}}"]),
  ]);
  const repository = remote.ok ? repositoryFromRemote(remote.stdout) : null;
  const ghUser = await command("gh", ["api", "user", "--jq", ".login"]);
  const branchName = branch.ok && branch.stdout.trim() !== "" ? branch.stdout.trim() : null;
  const headSha = head.ok ? head.stdout.trim() : null;
  const pushed = branchName === null
    ? { ok: false, stdout: "", stderr: "" }
    : await command("git", ["ls-remote", "--heads", "origin", `refs/heads/${branchName}`]);
  const pushedSha = pushed.ok ? pushed.stdout.trim().split(/\s/u)[0] ?? null : null;
  const verifyRun = repository === null || headSha === null
    ? { ok: false, stdout: "", stderr: "" }
    : await command("gh", [
        "run",
        "list",
        "--repo",
        repository,
        "--workflow",
        "Verify",
        "--commit",
        headSha,
        "--branch",
        "main",
        "--status",
        "success",
        "--limit",
        "20",
        "--json",
        "headSha,conclusion",
      ]);
  const successfulVerifyRun = verifyRun.ok && (() => {
    try {
      const runs = JSON.parse(verifyRun.stdout) as readonly { headSha?: unknown; conclusion?: unknown }[];
      return runs.some((run) => run.headSha === headSha && run.conclusion === "success");
    } catch {
      return false;
    }
  })();
  const workflowFiles = Object.fromEntries(await Promise.all(
    requirements.requiredWorkflowFiles.map(async (file) => [file, await fileExists(file)] as const),
  ));
  const environments = repository === null
    ? requirements.environments.map((environment) => ({
        name: environment.name,
        exists: false,
        secretNames: [],
        variables: {},
        requiredReviewerCount: 0,
      }))
    : await Promise.all(requirements.environments.map((environment) =>
        githubEnvironment(repository, environment.name)));
  const protectedBranch = repository === null
    ? {
        name: requirements.protectedBranch.name,
        exists: false,
        requiredStatusChecks: [],
        requireBranchesUpToDate: false,
        enforceAdmins: false,
        requirePullRequest: false,
        requiredApprovingReviewCount: 0,
        requireConversationResolution: false,
        allowForcePushes: false,
        allowDeletions: false,
      }
    : await githubBranchProtection(repository, requirements.protectedBranch.name);

  return {
    repository,
    githubAuthenticated: auth.ok && ghUser.ok,
    githubScopes: scopesFromStatus(`${auth.stdout}\n${auth.stderr}`),
    workflowFiles,
    protectedBranch,
    environments,
    git: {
      branch: branchName,
      headSha,
      clean: status.ok && status.stdout.trim() === "",
      pushedHeadMatches: headSha !== null && pushedSha === headSha,
      successfulVerifyRun,
    },
    dockerAvailable: docker.ok && docker.stdout.trim() !== "",
  };
}

const requirements = JSON.parse(
  await readFile("deploy/bootstrap-requirements.json", "utf8"),
) as ProductionBootstrapRequirements;
const report = assessProductionBootstrap(requirements, await snapshot(requirements));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Production bootstrap: ${report.githubSetupReady ? "GitHub setup ready" : "setup incomplete"}`);
  console.log(`Release candidate: ${report.releaseCandidateReady ? "ready" : "not ready"}`);
  console.log(`Checks: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.manual} manual`);
  for (const item of report.checks.filter((check) => check.status !== "passed")) {
    const marker = item.status === "manual" ? "MANUAL" : "MISSING";
    console.log(`- [${marker}] ${item.label}`);
    if (item.action !== null) console.log(`  ${item.action}`);
  }
  console.log("No secret values were read or printed; only configured names and public variables were inspected.");
}

if (process.argv.includes("--require-github-setup") && !report.githubSetupReady) {
  process.exitCode = 1;
}
if (process.argv.includes("--require-release-candidate") && !report.releaseCandidateReady) {
  process.exitCode = 1;
}
