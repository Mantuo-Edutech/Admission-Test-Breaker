import { execFileSync } from "node:child_process";

interface LocalSupabaseStatus {
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SERVICE_ROLE_KEY: string;
}

interface AdminUser {
  id: string;
}

interface PasswordSession {
  access_token: string;
}

interface EntitlementRow {
  package_id: string;
}

function readLocalStatus(): LocalSupabaseStatus {
  try {
    const output = execFileSync(
      "pnpm",
      ["exec", "supabase", "status", "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return JSON.parse(output) as LocalSupabaseStatus;
  } catch {
    throw new Error("Local Supabase is not running. Run `pnpm supabase:start` first.");
  }
}

async function jsonRequest<T>(
  url: string,
  init: RequestInit,
  label: string,
): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}: ${body.slice(0, 240)}`);
  }
  return (body.length === 0 ? null : JSON.parse(body)) as T;
}

async function main() {
  const status = readLocalStatus();
  const code = "MANTUO-TMUA-LOCAL-2026-ACCESS";
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `supabase-contract-${unique}@example.test`;
  const password = `Contract${unique}A1`;
  let userId: string | null = null;

  const publicHeaders = {
    apikey: status.PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  };
  const serviceHeaders = {
    apikey: status.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const preview = await jsonRequest<{ valid: boolean; packages?: string[] }>(
      `${status.API_URL}/functions/v1/invite-preview`,
      {
        method: "POST",
        headers: { ...publicHeaders, Origin: "http://127.0.0.1:57145" },
        body: JSON.stringify({ code }),
      },
      "Invite preview",
    );
    if (preview.valid !== true || !preview.packages?.includes("tmua-full-access")) {
      throw new Error("Invite preview did not expose the expected local package.");
    }

    const user = await jsonRequest<AdminUser>(
      `${status.API_URL}/auth/v1/admin/users`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ email, password, email_confirm: true }),
      },
      "Confirmed test user creation",
    );
    userId = user.id;

    const session = await jsonRequest<PasswordSession>(
      `${status.API_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: publicHeaders,
        body: JSON.stringify({ email, password }),
      },
      "Password login",
    );
    const authenticatedHeaders = {
      ...publicHeaders,
      Authorization: `Bearer ${session.access_token}`,
    };

    const redeemed = await jsonRequest<EntitlementRow[]>(
      `${status.API_URL}/rest/v1/rpc/redeem_invite`,
      {
        method: "POST",
        headers: authenticatedHeaders,
        body: JSON.stringify({ p_code: code }),
      },
      "Invite redemption",
    );
    if (!redeemed.some((row) => row.package_id === "tmua-full-access")) {
      throw new Error("Invite redemption did not return the expected entitlement.");
    }

    const entitlements = await jsonRequest<EntitlementRow[]>(
      `${status.API_URL}/rest/v1/user_entitlements?select=package_id`,
      { method: "GET", headers: authenticatedHeaders },
      "Entitlement lookup",
    );
    if (!entitlements.some((row) => row.package_id === "tmua-full-access")) {
      throw new Error("RLS-protected entitlement lookup did not return the redeemed package.");
    }

    process.stdout.write("Local Supabase HTTP access flow: PASS\n");
  } finally {
    if (userId !== null) {
      await fetch(`${status.API_URL}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: serviceHeaders,
      });
    }
  }
}

await main();
