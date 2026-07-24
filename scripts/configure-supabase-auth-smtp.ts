import { pathToFileURL } from "node:url";

const MANAGEMENT_API_ORIGIN = "https://api.supabase.com";
const SUPPORTED_SMTP_PORTS = new Set([465, 587, 2525]);

export interface SupabaseAuthSmtpStatus {
  external_email_enabled?: unknown;
  mailer_autoconfirm?: unknown;
  mailer_secure_email_change_enabled?: unknown;
  smtp_admin_email?: unknown;
  smtp_host?: unknown;
  smtp_port?: unknown;
  smtp_user?: unknown;
  smtp_pass?: unknown;
  smtp_sender_name?: unknown;
}

export interface SupabaseAuthSmtpConfiguration {
  readonly host: string;
  readonly port: number;
  readonly adminEmail: string;
  readonly senderName: string;
  readonly user: string;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function requiredSecretEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") throw new Error(`${name} is required`);
  return value;
}

function normalizeSmtpHost(value: string): string {
  const host = value.trim().toLowerCase();
  const labels = host.split(".");
  const reserved = [".example", ".invalid", ".local", ".localhost"]
    .some((suffix) => host.endsWith(suffix));
  if (
    host.length > 253
    || labels.length < 2
    || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))
    || /example|replace|localhost/iu.test(host)
    || reserved
    || /^\d+(?:\.\d+){3}$/u.test(host)
  ) {
    throw new Error("SMTP_HOST must be a production SMTP hostname without a URL scheme or port");
  }
  return host;
}

function normalizeSmtpPort(value: string | number): number {
  const text = typeof value === "number" ? String(value) : value.trim();
  const port = Number(text);
  if (!/^\d+$/u.test(text) || !Number.isInteger(port) || !SUPPORTED_SMTP_PORTS.has(port)) {
    throw new Error("SMTP_PORT must be one of 465, 587 or 2525");
  }
  return port;
}

function normalizeAdminEmail(value: string): string {
  const email = value.trim().toLowerCase();
  const match = /^[^\s@]+@([^\s@]+)$/u.exec(email);
  if (match === null || /example|replace|localhost/iu.test(email)) {
    throw new Error("SMTP_ADMIN_EMAIL must be a production sender email address");
  }
  normalizeSmtpHost(match[1]!);
  return email;
}

function normalizeSenderName(value: string): string {
  const senderName = value.trim();
  if (senderName.length < 2 || senderName.length > 80 || /[\r\n]/u.test(senderName)) {
    throw new Error("SMTP_SENDER_NAME must contain 2 to 80 characters without line breaks");
  }
  return senderName;
}

function normalizeSmtpUser(value: string): string {
  const user = value.trim();
  if (user.length < 1 || user.length > 512 || /[\r\n]/u.test(user)) {
    throw new Error("SMTP_USER has an invalid format");
  }
  return user;
}

export function smtpConfiguration(input: {
  readonly host: string;
  readonly port: string | number;
  readonly adminEmail: string;
  readonly senderName: string;
  readonly user: string;
}): SupabaseAuthSmtpConfiguration {
  return {
    host: normalizeSmtpHost(input.host),
    port: normalizeSmtpPort(input.port),
    adminEmail: normalizeAdminEmail(input.adminEmail),
    senderName: normalizeSenderName(input.senderName),
    user: normalizeSmtpUser(input.user),
  };
}

export function authSmtpPatch(
  configuration: SupabaseAuthSmtpConfiguration,
  password: string,
): Record<string, unknown> {
  if (password.length < 8 || password.length > 4096 || /[\r\n]/u.test(password)) {
    throw new Error("SMTP_PASS is missing or has an invalid format");
  }
  return {
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    mailer_autoconfirm: false,
    smtp_admin_email: configuration.adminEmail,
    smtp_host: configuration.host,
    // The Management API schema requires the port as a string even though the
    // returned Auth configuration may expose it as either a string or number.
    smtp_port: String(configuration.port),
    smtp_user: configuration.user,
    smtp_pass: password,
    smtp_sender_name: configuration.senderName,
  };
}

function statusPort(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const port = Number(value);
  return Number.isInteger(port) ? port : null;
}

export function authSmtpIsReady(
  status: SupabaseAuthSmtpStatus,
  expected: SupabaseAuthSmtpConfiguration,
): boolean {
  return status.external_email_enabled === true
    && status.mailer_secure_email_change_enabled === true
    && status.mailer_autoconfirm === false
    && status.smtp_host === expected.host
    && statusPort(status.smtp_port) === expected.port
    && status.smtp_admin_email === expected.adminEmail
    && status.smtp_sender_name === expected.senderName
    && status.smtp_user === expected.user
    && typeof status.smtp_pass === "string"
    && status.smtp_pass.length > 0;
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
): Promise<SupabaseAuthSmtpStatus> {
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
  return await response.json() as SupabaseAuthSmtpStatus;
}

export async function run(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const accessToken = requiredSecretEnvironment("SUPABASE_ACCESS_TOKEN");
  const endpoint = projectEndpoint(requiredEnvironment("SUPABASE_PROJECT_REF"));
  const expected = smtpConfiguration({
    host: requiredEnvironment("SMTP_HOST"),
    port: requiredEnvironment("SMTP_PORT"),
    adminEmail: requiredEnvironment("SMTP_ADMIN_EMAIL"),
    senderName: requiredEnvironment("SMTP_SENDER_NAME"),
    user: requiredSecretEnvironment("SMTP_USER"),
  });
  let status = await requestAuthConfiguration(endpoint, accessToken);

  if (apply) {
    const patch = authSmtpPatch(expected, requiredSecretEnvironment("SMTP_PASS"));
    await requestAuthConfiguration(endpoint, accessToken, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    status = await requestAuthConfiguration(endpoint, accessToken);
  }

  const summary = {
    configured: authSmtpIsReady(status, expected),
    hostMatches: status.smtp_host === expected.host,
    portMatches: statusPort(status.smtp_port) === expected.port,
    senderMatches: status.smtp_admin_email === expected.adminEmail
      && status.smtp_sender_name === expected.senderName,
    credentialsPresent: typeof status.smtp_user === "string"
      && status.smtp_user.length > 0
      && typeof status.smtp_pass === "string"
      && status.smtp_pass.length > 0,
    confirmationRequired: status.mailer_autoconfirm === false,
  };
  console.log(`Supabase Auth custom SMTP: ${JSON.stringify(summary)}`);
  if (!authSmtpIsReady(status, expected)) {
    throw new Error(
      "Supabase Auth custom SMTP is incomplete. Run this command again with --apply and the approved SMTP environment variables.",
    );
  }
}

const executable = process.argv[1] === undefined
  ? undefined
  : pathToFileURL(process.argv[1]).href;
if (executable === import.meta.url) {
  await run();
}
