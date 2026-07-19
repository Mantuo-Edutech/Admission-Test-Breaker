import { pathToFileURL } from "node:url";

interface DeploymentVersion {
  release?: unknown;
  environment?: unknown;
}

export interface DeployedBrowserRuntime {
  supabaseUrl: string;
  supabasePublishableKey: string;
  turnstileSiteKey: string;
  release: string;
  environment: string;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function read(
  url: URL,
  label: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
  return response;
}

function runtimeString(source: string, key: string): string {
  const match = source.match(
    new RegExp(`(?:\\b|\")${key}\"?\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`, "u"),
  );
  if (match?.[1] === undefined) {
    throw new Error(`Runtime configuration is missing ${key}`);
  }
  const value = JSON.parse(match[1]) as unknown;
  if (typeof value !== "string") {
    throw new Error(`Runtime configuration field ${key} is not a string`);
  }
  return value.trim();
}

export function parseDeployedBrowserRuntime(source: string): DeployedBrowserRuntime {
  if (!source.includes("__MANTUO_RUNTIME_CONFIG__")) {
    throw new Error("Runtime configuration global is missing");
  }
  return {
    supabaseUrl: runtimeString(source, "supabaseUrl"),
    supabasePublishableKey: runtimeString(source, "supabasePublishableKey"),
    turnstileSiteKey: runtimeString(source, "turnstileSiteKey"),
    release: runtimeString(source, "release"),
    environment: runtimeString(source, "environment"),
  };
}

function placeholder(value: string): boolean {
  return value.length === 0 || /replace|example|your[_-]?key|ci[_-]?only|missing/iu.test(value);
}

export function assertDeployedBrowserRuntime(
  runtime: DeployedBrowserRuntime,
  expectedEnvironment?: string,
  expectedRelease?: string,
  expectedProjectRef?: string,
): void {
  if (expectedEnvironment && runtime.environment !== expectedEnvironment) {
    throw new Error(
      `Expected runtime environment ${expectedEnvironment}, received ${runtime.environment}`,
    );
  }
  if (expectedRelease && runtime.release !== expectedRelease) {
    throw new Error(`Expected runtime release ${expectedRelease}, received ${runtime.release}`);
  }

  if (runtime.environment !== "staging" && runtime.environment !== "production") return;

  let supabaseUrl: URL;
  try {
    supabaseUrl = new URL(runtime.supabaseUrl);
  } catch {
    throw new Error("Deployed Supabase URL is invalid");
  }
  if (
    supabaseUrl.protocol !== "https:"
    || !supabaseUrl.hostname.endsWith(".supabase.co")
    || supabaseUrl.pathname !== "/"
  ) {
    throw new Error("Deployed Supabase URL must be a hosted HTTPS project origin");
  }
  if (
    placeholder(runtime.supabasePublishableKey)
    || !runtime.supabasePublishableKey.startsWith("sb_publishable_")
    || runtime.supabasePublishableKey.length < 24
  ) {
    throw new Error("Deployed Supabase publishable key is empty, placeholder or malformed");
  }
  if (placeholder(runtime.turnstileSiteKey) || runtime.turnstileSiteKey.length < 20) {
    throw new Error("Deployed Turnstile site key is empty, placeholder or malformed");
  }
  if (
    expectedProjectRef
    && supabaseUrl.hostname !== `${expectedProjectRef}.supabase.co`
  ) {
    throw new Error(
      `Expected Supabase project ${expectedProjectRef}, received ${supabaseUrl.hostname}`,
    );
  }
}

async function verifySupabaseAuth(runtime: DeployedBrowserRuntime): Promise<void> {
  if (runtime.environment !== "staging" && runtime.environment !== "production") return;
  const headers = { apikey: runtime.supabasePublishableKey };
  const health = await read(
    new URL("/auth/v1/health", runtime.supabaseUrl),
    "Supabase Auth health",
    { headers },
  );
  const healthBody = await health.json() as { name?: unknown; version?: unknown };
  if (healthBody.name !== "GoTrue" || typeof healthBody.version !== "string") {
    throw new Error("Supabase Auth health response is incomplete");
  }

  const settings = await read(
    new URL("/auth/v1/settings", runtime.supabaseUrl),
    "Supabase Auth public settings",
    { headers },
  );
  const settingsBody = await settings.json() as {
    disable_signup?: unknown;
    autoconfirm?: unknown;
  };
  if (settingsBody.disable_signup !== false) {
    throw new Error("Supabase Auth public email registration is not enabled");
  }
  if (settingsBody.autoconfirm !== false) {
    throw new Error("Supabase Auth email confirmation is not enforced");
  }
}

export async function run(): Promise<void> {
  const baseUrl = new URL(requiredEnvironment("DEPLOYMENT_BASE_URL"));
  const expectedRelease = process.env.EXPECTED_RELEASE?.trim();
  const expectedEnvironment = process.env.EXPECTED_ENVIRONMENT?.trim();
  const expectedProjectRef = process.env.EXPECTED_SUPABASE_PROJECT_REF?.trim();

  const health = await read(new URL("/healthz", baseUrl), "Health endpoint");
  if ((await health.json() as { status?: unknown }).status !== "ok") {
    throw new Error("Health endpoint did not return the expected status");
  }

  const versionResponse = await read(new URL("/version.json", baseUrl), "Version endpoint");
  const version = await versionResponse.json() as DeploymentVersion;
  if (typeof version.release !== "string" || typeof version.environment !== "string") {
    throw new Error("Version endpoint is incomplete");
  }
  if (expectedRelease && version.release !== expectedRelease) {
    throw new Error(`Expected release ${expectedRelease}, received ${version.release}`);
  }
  if (expectedEnvironment && version.environment !== expectedEnvironment) {
    throw new Error(`Expected environment ${expectedEnvironment}, received ${version.environment}`);
  }

  const runtimeResponse = await read(
    new URL("/runtime-config.js", baseUrl),
    "Runtime configuration",
  );
  const runtimeBody = await runtimeResponse.text();
  if (/service[_-]?role|SUPABASE_SERVICE|SECRET_KEY/iu.test(runtimeBody)) {
    throw new Error("A privileged credential name leaked into runtime configuration");
  }
  const runtime = parseDeployedBrowserRuntime(runtimeBody);
  assertDeployedBrowserRuntime(
    runtime,
    expectedEnvironment,
    expectedRelease,
    expectedProjectRef,
  );
  if (runtime.environment !== version.environment || runtime.release !== version.release) {
    throw new Error("Runtime configuration and version endpoint do not identify the same release");
  }
  await verifySupabaseAuth(runtime);

  const homepage = await read(new URL("/", baseUrl), "Homepage");
  const homepageBody = await homepage.text();
  if (
    !homepageBody.includes('<script src="/runtime-config.js"></script>')
    || !homepageBody.includes('id="root"')
  ) {
    throw new Error("Homepage does not load the runtime configuration before the app");
  }

  const requiredHeaders = [
    "content-security-policy",
    "permissions-policy",
    "referrer-policy",
    "x-content-type-options",
    "x-frame-options",
  ];
  for (const header of requiredHeaders) {
    if (!homepage.headers.get(header)) {
      throw new Error(`Homepage is missing the ${header} security header`);
    }
  }

  const contentSecurityPolicy = homepage.headers.get("content-security-policy") ?? "";
  if (
    !contentSecurityPolicy.includes("script-src 'self' https://challenges.cloudflare.com")
    || !contentSecurityPolicy.includes("frame-src https://challenges.cloudflare.com")
  ) {
    throw new Error("Homepage CSP does not allow the configured Turnstile challenge");
  }

  console.log(
    `Deployment verification: PASS (${baseUrl.origin}, ${version.environment}, ${version.release})`,
  );
}

const executable = process.argv[1] === undefined
  ? undefined
  : pathToFileURL(process.argv[1]).href;
if (executable === import.meta.url) {
  await run();
}
