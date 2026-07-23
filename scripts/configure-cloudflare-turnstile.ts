import { execFile as execFileCallback, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  buildTurnstileBootstrapPlan,
  reconcileTurnstileWidget,
  TURNSTILE_BOOTSTRAP_CONFIRMATION,
  turnstileDomainCollisions,
  turnstileWidgetIsReady,
  type CloudflareTurnstileWidget,
  type DesiredTurnstileWidget,
  type TurnstileBootstrapInput,
} from "../src/platform/turnstile-bootstrap.js";

const execFile = promisify(execFileCallback);
const CLOUDFLARE_API_ORIGIN = "https://api.cloudflare.com/client/v4";

type ExecutionMode = "dry-run" | "check" | "apply";

interface CloudflareEnvelope {
  readonly success?: unknown;
  readonly result?: unknown;
  readonly errors?: readonly { readonly code?: unknown }[];
  readonly result_info?: { readonly total_pages?: unknown };
}

interface CommandResult {
  readonly ok: boolean;
  readonly stdout: string;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function executionMode(): ExecutionMode {
  const check = process.argv.includes("--check");
  const apply = process.argv.includes("--apply");
  if (check && apply) throw new Error("--check 与 --apply 不能同时使用。");
  return apply ? "apply" : check ? "check" : "dry-run";
}

function requiredSecretEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") throw new Error(`${name} is required`);
  return value;
}

function accountId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/u.test(normalized)) {
    throw new Error("Cloudflare account ID must contain exactly 32 hexadecimal characters");
  }
  return normalized;
}

function apiToken(value: string): string {
  if (!/^[A-Za-z0-9_-]{20,512}$/u.test(value)) {
    throw new Error("Cloudflare Turnstile API token has an invalid format");
  }
  return value;
}

function widgetEndpoint(account: string, suffix = ""): URL {
  return new URL(`/accounts/${account}/challenges/widgets${suffix}`, CLOUDFLARE_API_ORIGIN);
}

async function cloudflareRequest(
  url: URL,
  token: string,
  init: RequestInit = {},
): Promise<CloudflareEnvelope> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    signal: AbortSignal.timeout(20_000),
  });
  let envelope: CloudflareEnvelope = {};
  try {
    envelope = await response.json() as CloudflareEnvelope;
  } catch {
    throw new Error(`Cloudflare Turnstile API returned unreadable HTTP ${response.status}`);
  }
  if (!response.ok || envelope.success !== true) {
    const codes = (envelope.errors ?? [])
      .flatMap((error) => typeof error.code === "number" ? [String(error.code)] : [])
      .slice(0, 5);
    const suffix = codes.length > 0 ? ` (codes ${codes.join(",")})` : "";
    throw new Error(`Cloudflare Turnstile API failed with HTTP ${response.status}${suffix}`);
  }
  return envelope;
}

function widget(value: unknown, label: string): CloudflareTurnstileWidget {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Cloudflare returned an invalid ${label} widget response`);
  }
  return value as CloudflareTurnstileWidget;
}

function widgetSitekey(value: CloudflareTurnstileWidget): string {
  if (typeof value.sitekey !== "string" || !/^0x[A-Za-z0-9_-]{16,40}$/u.test(value.sitekey)) {
    throw new Error("Cloudflare widget is missing a valid production site key");
  }
  return value.sitekey;
}

function widgetSecret(value: CloudflareTurnstileWidget): string {
  if (typeof value.secret !== "string" || value.secret.length < 20) {
    throw new Error("Cloudflare widget is missing its managed secret");
  }
  return value.secret;
}

async function listWidgets(account: string, token: string): Promise<readonly CloudflareTurnstileWidget[]> {
  const widgets: CloudflareTurnstileWidget[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = widgetEndpoint(account);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "50");
    const envelope = await cloudflareRequest(url, token);
    if (!Array.isArray(envelope.result)) {
      throw new Error("Cloudflare returned an invalid widget list");
    }
    widgets.push(...envelope.result.map((value) => widget(value, "listed")));
    const reportedPages = envelope.result_info?.total_pages;
    totalPages = typeof reportedPages === "number" && Number.isSafeInteger(reportedPages)
      ? reportedPages
      : 1;
    if (totalPages > 20) throw new Error("Cloudflare widget inventory exceeds the audited page limit");
    page += 1;
  } while (page <= totalPages);
  return widgets;
}

async function getWidget(
  account: string,
  token: string,
  sitekey: string,
): Promise<CloudflareTurnstileWidget> {
  const envelope = await cloudflareRequest(widgetEndpoint(account, `/${sitekey}`), token);
  return widget(envelope.result, "detailed");
}

async function createWidget(
  account: string,
  token: string,
  desired: DesiredTurnstileWidget,
): Promise<CloudflareTurnstileWidget> {
  const envelope = await cloudflareRequest(widgetEndpoint(account), token, {
    method: "POST",
    body: JSON.stringify({
      name: desired.name,
      domains: desired.domains,
      mode: desired.mode,
      region: desired.region,
    }),
  });
  return widget(envelope.result, "created");
}

async function updateWidget(
  account: string,
  token: string,
  sitekey: string,
  desired: DesiredTurnstileWidget,
): Promise<CloudflareTurnstileWidget> {
  const envelope = await cloudflareRequest(widgetEndpoint(account, `/${sitekey}`), token, {
    method: "PUT",
    body: JSON.stringify({
      name: desired.name,
      domains: desired.domains,
      mode: desired.mode,
    }),
  });
  return widget(envelope.result, "updated");
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

async function setGitHubDelivery(
  repository: string,
  environment: "staging" | "production",
  sitekey: string,
  secret: string,
): Promise<void> {
  await requireCommand(
    "gh",
    ["variable", "set", "--repo", repository, "--env", environment, "TURNSTILE_SITE_KEY", "--body", sitekey],
    `设置 ${environment} Turnstile site key`,
  );
  await commandWithSecretStdin(
    "gh",
    ["secret", "set", "--repo", repository, "--env", environment, "TURNSTILE_SECRET_KEY"],
    secret,
    `设置 ${environment} Turnstile secret`,
  );
}

async function verifyGitHubDelivery(
  repository: string,
  environment: "staging" | "production",
  expectedSitekey: string,
): Promise<void> {
  const variablesText = await requireCommand(
    "gh",
    ["variable", "list", "--repo", repository, "--env", environment, "--json", "name,value"],
    `读取 ${environment} GitHub variables`,
  );
  const secretsText = await requireCommand(
    "gh",
    ["secret", "list", "--repo", repository, "--env", environment, "--json", "name"],
    `读取 ${environment} GitHub secrets`,
  );
  let variables: unknown;
  let secrets: unknown;
  try {
    variables = JSON.parse(variablesText);
    secrets = JSON.parse(secretsText);
  } catch {
    throw new Error(`GitHub Environment ${environment} 返回无法解析的配置清单。`);
  }
  const hasSitekey = Array.isArray(variables) && variables.some((value) =>
    typeof value === "object" && value !== null
    && "name" in value && value.name === "TURNSTILE_SITE_KEY"
    && "value" in value && value.value === expectedSitekey);
  const hasSecret = Array.isArray(secrets) && secrets.some((value) =>
    typeof value === "object" && value !== null
    && "name" in value && value.name === "TURNSTILE_SECRET_KEY");
  if (!hasSitekey || !hasSecret) {
    throw new Error(`GitHub Environment ${environment} 未绑定同一 Turnstile widget。`);
  }
}

const mode = executionMode();
const configPath = argument("--config");
if (configPath === undefined) {
  throw new Error(
    "缺少 --config <path>；复制 deploy/turnstile-bootstrap.example.json 到不进 Git 的 local 文件。",
  );
}
const input = JSON.parse(await readFile(configPath, "utf8")) as TurnstileBootstrapInput;
const plan = buildTurnstileBootstrapPlan(input);

console.log(`Turnstile bootstrap plan: ${plan.valid ? "valid" : "invalid"}`);
console.log(`Mode: ${mode}`);
for (const issue of plan.issues) console.log(`- [INVALID] ${issue}`);
for (const desired of plan.widgets) {
  console.log(`- [PLAN] ${desired.environment}: ${desired.name} -> ${desired.domains.join(", ")}`);
}
console.log("API token and widget secrets are neither stored in the config nor shown in this plan.");
if (!plan.valid) process.exit(1);
if (mode === "dry-run") process.exit(0);
if (mode === "apply" && argument("--confirm") !== TURNSTILE_BOOTSTRAP_CONFIRMATION) {
  throw new Error("缺少 Turnstile bootstrap 显式确认，未执行任何外部写入。");
}

const account = accountId(requiredSecretEnvironment(plan.accountIdEnvironmentVariable));
const token = apiToken(requiredSecretEnvironment(plan.apiTokenEnvironmentVariable));
const listed = await listWidgets(account, token);

for (const desired of plan.widgets) {
  if (turnstileDomainCollisions(desired, listed).length > 0) {
    throw new Error(
      `${desired.environment} hostname is already assigned to a differently named Turnstile widget`,
    );
  }
  const named = listed.filter((candidate) => candidate.name === desired.name);
  if (named.length > 1) {
    throw new Error(`Cloudflare account contains duplicate widgets named ${desired.name}`);
  }
  const current = named.length === 1
    ? await getWidget(account, token, widgetSitekey(named[0]!))
    : undefined;
  const reconciliation = reconcileTurnstileWidget(desired, current === undefined ? [] : [current]);

  if (mode === "check" && reconciliation.action !== "reuse") {
    throw new Error(`${desired.environment} Turnstile widget requires ${reconciliation.action}`);
  }

  let configured: CloudflareTurnstileWidget;
  if (reconciliation.action === "create") {
    configured = await createWidget(account, token, desired);
  } else if (reconciliation.action === "update") {
    configured = await updateWidget(account, token, widgetSitekey(reconciliation.current), desired);
  } else {
    configured = reconciliation.current;
  }

  const detailed = await getWidget(account, token, widgetSitekey(configured));
  if (!turnstileWidgetIsReady(detailed, desired)) {
    throw new Error(`${desired.environment} Turnstile widget failed exact post-configuration verification`);
  }
  const sitekey = widgetSitekey(detailed);
  if (mode === "apply") {
    await setGitHubDelivery(plan.repository, desired.environment, sitekey, widgetSecret(detailed));
  }
  await verifyGitHubDelivery(plan.repository, desired.environment, sitekey);
  console.log(`- [VERIFIED] ${desired.environment} hostname isolation and GitHub delivery`);
}

console.log(`Turnstile bootstrap ${mode} completed without printing API tokens, site keys or widget secrets.`);
