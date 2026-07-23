export const TURNSTILE_BOOTSTRAP_CONFIRMATION =
  "CONFIGURE_MANTUO_TURNSTILE_WIDGETS";

export interface TurnstileBootstrapInputWidget {
  readonly environment: "staging" | "production";
  readonly name: string;
  readonly domains: readonly string[];
}

export interface TurnstileBootstrapInput {
  readonly schemaVersion: 1;
  readonly repository: string;
  readonly accountIdEnvironmentVariable: string;
  readonly apiTokenEnvironmentVariable: string;
  readonly widgets: readonly TurnstileBootstrapInputWidget[];
}

export interface DesiredTurnstileWidget {
  readonly environment: "staging" | "production";
  readonly name: string;
  readonly domains: readonly string[];
  readonly mode: "managed";
  readonly region: "world";
}

export interface TurnstileBootstrapPlan {
  readonly schemaVersion: 1;
  readonly repository: string;
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly accountIdEnvironmentVariable: string;
  readonly apiTokenEnvironmentVariable: string;
  readonly widgets: readonly DesiredTurnstileWidget[];
}

export interface CloudflareTurnstileWidget {
  readonly name?: unknown;
  readonly domains?: unknown;
  readonly mode?: unknown;
  readonly region?: unknown;
  readonly sitekey?: unknown;
  readonly secret?: unknown;
}

export type TurnstileWidgetReconciliation =
  | { readonly action: "create"; readonly desired: DesiredTurnstileWidget }
  | {
      readonly action: "reuse" | "update";
      readonly desired: DesiredTurnstileWidget;
      readonly current: CloudflareTurnstileWidget;
    };

const REPOSITORY = "Mantuo-Edutech/Admission-Test-Breaker";

function validEnvironmentVariableName(value: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/u.test(value);
}

function normalizedDomain(value: string): string | null {
  const domain = value.trim().toLowerCase();
  const labels = domain.split(".");
  const reserved = [".example", ".invalid", ".local", ".localhost"]
    .some((suffix) => domain.endsWith(suffix));
  if (
    domain.length > 253
    || labels.length < 2
    || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))
    || /example|replace|localhost/iu.test(domain)
    || reserved
    || /^\d+(?:\.\d+){3}$/u.test(domain)
  ) return null;
  return domain;
}

function duplicates(values: readonly string[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

export function buildTurnstileBootstrapPlan(
  input: TurnstileBootstrapInput,
): TurnstileBootstrapPlan {
  const issues: string[] = [];
  const widgets: DesiredTurnstileWidget[] = [];
  if (input.schemaVersion !== 1) issues.push("配置 schemaVersion 必须为 1。");
  if (input.repository !== REPOSITORY) issues.push(`配置仓库必须为 ${REPOSITORY}。`);
  if (!validEnvironmentVariableName(input.accountIdEnvironmentVariable)) {
    issues.push("accountIdEnvironmentVariable 必须是合法的本机环境变量名。");
  }
  if (!validEnvironmentVariableName(input.apiTokenEnvironmentVariable)) {
    issues.push("apiTokenEnvironmentVariable 必须是合法的本机环境变量名。");
  }

  for (const environment of ["staging", "production"] as const) {
    const matches = input.widgets.filter((widget) => widget.environment === environment);
    if (matches.length !== 1) {
      issues.push(`${environment} 必须且只能配置一个 Turnstile widget。`);
      continue;
    }
    const widget = matches[0]!;
    const name = widget.name.trim();
    if (name.length < 3 || name.length > 254 || /[\r\n]/u.test(name) || /replace|example/iu.test(name)) {
      issues.push(`${environment} widget name 缺失或不合法。`);
    }
    const domains = widget.domains.map(normalizedDomain);
    if (domains.length === 0 || domains.length > 10 || domains.some((domain) => domain === null)) {
      issues.push(`${environment} domains 必须包含 1–10 个正式 hostname。`);
      continue;
    }
    const normalized = domains as string[];
    if (duplicates(normalized).length > 0) {
      issues.push(`${environment} domains 不得重复。`);
    }
    widgets.push({ environment, name, domains: [...normalized].sort(), mode: "managed", region: "world" });
  }

  for (const name of duplicates(input.widgets.map((widget) => widget.name.trim()))) {
    issues.push(`widget name ${name} 在两个环境中重复。`);
  }
  for (const domain of duplicates(widgets.flatMap((widget) => widget.domains))) {
    issues.push(`hostname ${domain} 不得同时授权给 staging 与 production。`);
  }
  for (const widget of input.widgets) {
    if (widget.environment !== "staging" && widget.environment !== "production") {
      issues.push(`不支持 Turnstile 环境 ${String(widget.environment)}。`);
    }
  }

  return {
    schemaVersion: 1,
    repository: REPOSITORY,
    valid: issues.length === 0,
    issues,
    accountIdEnvironmentVariable: input.accountIdEnvironmentVariable,
    apiTokenEnvironmentVariable: input.apiTokenEnvironmentVariable,
    widgets,
  };
}

function currentDomains(widget: CloudflareTurnstileWidget): readonly string[] {
  if (!Array.isArray(widget.domains)) return [];
  return widget.domains
    .filter((domain): domain is string => typeof domain === "string")
    .map((domain) => domain.trim().toLowerCase())
    .sort();
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function turnstileWidgetIsReady(
  widget: CloudflareTurnstileWidget,
  desired: DesiredTurnstileWidget,
): boolean {
  return turnstileWidgetConfigurationMatches(widget, desired)
    && typeof widget.sitekey === "string"
    && /^0x[A-Za-z0-9_-]{16,40}$/u.test(widget.sitekey)
    && typeof widget.secret === "string"
    && widget.secret.length >= 20;
}

export function turnstileWidgetConfigurationMatches(
  widget: CloudflareTurnstileWidget,
  desired: DesiredTurnstileWidget,
): boolean {
  return widget.name === desired.name
    && widget.mode === desired.mode
    && widget.region === desired.region
    && sameValues(currentDomains(widget), desired.domains);
}

export function reconcileTurnstileWidget(
  desired: DesiredTurnstileWidget,
  widgets: readonly CloudflareTurnstileWidget[],
): TurnstileWidgetReconciliation {
  const matches = widgets.filter((widget) => widget.name === desired.name);
  if (matches.length > 1) {
    throw new Error(`Cloudflare account contains duplicate widgets named ${desired.name}`);
  }
  if (matches.length === 0) return { action: "create", desired };
  const current = matches[0]!;
  if (current.region !== desired.region) {
    throw new Error(`${desired.name} uses immutable region ${String(current.region)} instead of world`);
  }
  return {
    action: turnstileWidgetConfigurationMatches(current, desired) ? "reuse" : "update",
    desired,
    current,
  };
}

export function turnstileDomainCollisions(
  desired: DesiredTurnstileWidget,
  widgets: readonly CloudflareTurnstileWidget[],
): readonly CloudflareTurnstileWidget[] {
  const desiredDomains = new Set(desired.domains);
  return widgets.filter((widget) =>
    widget.name !== desired.name
    && currentDomains(widget).some((domain) => desiredDomains.has(domain)));
}
