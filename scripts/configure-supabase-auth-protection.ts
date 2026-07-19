import { pathToFileURL } from "node:url";

const MANAGEMENT_API_ORIGIN = "https://api.supabase.com";

export interface SupabaseAuthProtectionStatus {
  security_captcha_enabled?: unknown;
  security_captcha_provider?: unknown;
  site_url?: unknown;
  uri_allow_list?: unknown;
  external_email_enabled?: unknown;
  mailer_autoconfirm?: unknown;
  password_min_length?: unknown;
  password_required_characters?: unknown;
  refresh_token_rotation_enabled?: unknown;
}

const LOWER_UPPER_DIGITS =
  "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789";

function publicAppOrigin(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("PUBLIC_APP_ORIGIN must be an HTTPS origin without a path, query or hash");
  }
  return url.origin;
}

function redirectAllowList(existing: unknown, origin: string): string {
  const current = typeof existing === "string"
    ? existing.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
  return [...new Set([
    ...current,
    `${origin}/auth/confirm`,
    `${origin}/auth/reset`,
  ])].join(",");
}

export function authProtectionPatch(
  secret: string,
  appOrigin: string,
  existingRedirectAllowList?: unknown,
): Record<string, unknown> {
  const cleanedSecret = secret.trim();
  if (cleanedSecret.length < 10) {
    throw new Error("TURNSTILE_SECRET_KEY is missing or implausibly short");
  }
  const origin = publicAppOrigin(appOrigin);
  return {
    security_captcha_enabled: true,
    security_captcha_provider: "turnstile",
    security_captcha_secret: cleanedSecret,
    site_url: origin,
    uri_allow_list: redirectAllowList(existingRedirectAllowList, origin),
    external_email_enabled: true,
    mailer_autoconfirm: false,
    password_min_length: 10,
    password_required_characters: LOWER_UPPER_DIGITS,
    refresh_token_rotation_enabled: true,
  };
}

export function authProtectionIsReady(
  status: SupabaseAuthProtectionStatus,
  appOrigin?: string,
): boolean {
  if (
    status.security_captcha_enabled !== true
    || status.security_captcha_provider !== "turnstile"
  ) return false;
  if (appOrigin === undefined) return true;

  const origin = publicAppOrigin(appOrigin);
  const allowed = typeof status.uri_allow_list === "string"
    ? status.uri_allow_list.split(",").map((item) => item.trim())
    : [];
  return status.site_url === origin
    && allowed.includes(`${origin}/auth/confirm`)
    && allowed.includes(`${origin}/auth/reset`)
    && status.external_email_enabled === true
    && status.mailer_autoconfirm === false
    && typeof status.password_min_length === "number"
    && status.password_min_length >= 10
    && status.password_required_characters === LOWER_UPPER_DIGITS
    && status.refresh_token_rotation_enabled === true;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function projectEndpoint(projectRef: string): URL {
  if (!/^[a-z0-9]{8,40}$/u.test(projectRef)) {
    throw new Error("SUPABASE_PROJECT_REF has an invalid format");
  }
  return new URL(`/v1/projects/${projectRef}/config/auth`, MANAGEMENT_API_ORIGIN);
}

async function requestAuthConfiguration(
  endpoint: URL,
  accessToken: string,
  init: RequestInit = {},
): Promise<SupabaseAuthProtectionStatus> {
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Supabase Management API returned HTTP ${response.status}`);
  }
  return await response.json() as SupabaseAuthProtectionStatus;
}

export async function run(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const accessToken = requiredEnvironment("SUPABASE_ACCESS_TOKEN");
  const endpoint = projectEndpoint(requiredEnvironment("SUPABASE_PROJECT_REF"));
  const appOrigin = requiredEnvironment("PUBLIC_APP_ORIGIN");
  let status = await requestAuthConfiguration(endpoint, accessToken);

  if (apply) {
    const patch = authProtectionPatch(
      requiredEnvironment("TURNSTILE_SECRET_KEY"),
      appOrigin,
      status.uri_allow_list,
    );
    await requestAuthConfiguration(endpoint, accessToken, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    status = await requestAuthConfiguration(endpoint, accessToken);
  }

  const summary = {
    enabled: status.security_captcha_enabled === true,
    provider: typeof status.security_captcha_provider === "string"
      ? status.security_captcha_provider
      : null,
    siteUrlMatches: status.site_url === publicAppOrigin(appOrigin),
    emailConfirmationRequired: status.mailer_autoconfirm === false,
    passwordMinLength: typeof status.password_min_length === "number"
      ? status.password_min_length
      : null,
  };
  console.log(`Supabase Auth bot protection: ${JSON.stringify(summary)}`);
  if (!authProtectionIsReady(status, appOrigin)) {
    throw new Error(
      "Supabase Auth production baseline is incomplete. Run this command again with --apply, PUBLIC_APP_ORIGIN and TURNSTILE_SECRET_KEY.",
    );
  }
}

const executable = process.argv[1] === undefined
  ? undefined
  : pathToFileURL(process.argv[1]).href;
if (executable === import.meta.url) {
  await run();
}
