import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260715090000_private_account_foundation.sql";

describe("Supabase architecture contracts", () => {
  it("keeps every learner-owned and entitlement table behind RLS", async () => {
    const migration = await readFile(migrationPath, "utf8");
    for (const table of [
      "app_users",
      "learner_spaces",
      "preparation_profiles",
      "practice_sessions",
      "learning_events",
      "content_resources",
      "user_entitlements",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
    expect(migration).toContain("using (auth_user_id = (select auth.uid()))");
    expect(migration).toContain("private.owns_learner_space(learner_space_id)");
    expect(migration).toContain("using (user_id = (select auth.uid()))");
  });

  it("keeps invite creation and preview validation off the browser roles", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain(
      "revoke all on function public.issue_invite(text, text[], integer, timestamptz, interval) from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.issue_invite(text, text[], integer, timestamptz, interval) to service_role;",
    );
    expect(migration).toContain(
      "grant execute on function public.redeem_invite(text) to authenticated;",
    );

    const edgeFunction = await readFile("supabase/functions/invite-preview/index.ts", "utf8");
    expect(edgeFunction).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edgeFunction).not.toMatch(/console\.(?:log|info|debug)\s*\(/);
  });

  it("requires verified email and a production-grade password baseline", async () => {
    const config = await readFile("supabase/config.toml", "utf8");
    expect(config).toContain("minimum_password_length = 10");
    expect(config).toContain('password_requirements = "lower_upper_letters_digits"');
    expect(config).toMatch(/\[auth\.email\][\s\S]*enable_confirmations = true/);
    expect(config).toContain("http://127.0.0.1:57145/auth/confirm");
  });

  it("keeps local seed codes explicitly scoped to local development", async () => {
    const seed = await readFile("supabase/seed.sql", "utf8");
    expect(seed).toContain("LOCAL-2026-ACCESS");
    expect(seed).toMatch(/local[- ]only/i);
  });
});
