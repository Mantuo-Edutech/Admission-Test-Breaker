import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string): Promise<string> {
  return readFile(path, "utf8");
}

describe("production platform contracts", () => {
  it("builds one immutable, non-root web image with a runtime configuration boundary", async () => {
    const [dockerfile, index, template, entrypoint] = await Promise.all([
      source("Dockerfile"),
      source("index.html"),
      source("deploy/runtime-config.template.js"),
      source("deploy/40-runtime-config.sh"),
    ]);

    expect(dockerfile).toContain("pnpm build && pnpm verify:private-content-bundle");
    expect(dockerfile).toContain("USER nginx");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(index.indexOf('/runtime-config.js')).toBeLessThan(
      index.indexOf('/src/app/main.tsx'),
    );
    expect(template).toContain("SUPABASE_PUBLISHABLE_KEY");
    expect(template).toContain("TURNSTILE_SITE_KEY");
    expect(entrypoint).toContain("TURNSTILE_SITE_KEY is required for staging and production");
    expect(`${template}\n${entrypoint}`).not.toMatch(
      /service[_-]?role|SUPABASE_SERVICE|SECRET_KEY/iu,
    );
  });

  it("serves SPA routes with explicit health, release and browser security headers", async () => {
    const [nginx, headers] = await Promise.all([
      source("deploy/nginx.conf"),
      source("deploy/security-headers.conf"),
    ]);

    expect(nginx).toContain("location = /healthz");
    expect(nginx).toContain("location = /version.json");
    expect(nginx).toContain("try_files $uri $uri/ /index.html");
    expect(headers).toContain("Content-Security-Policy");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain("frame-src https://challenges.cloudflare.com");
    expect(headers).toContain("script-src 'self' https://challenges.cloudflare.com");
    expect(headers).toContain("X-Content-Type-Options");
  });

  it("verifies the actual deployed browser identity and hosted Auth service", async () => {
    const [verifier, remoteSupabaseVerifier] = await Promise.all([
      source("scripts/verify-deployment.ts"),
      source("scripts/verify-supabase-remote.ts"),
    ]);

    expect(verifier).toContain("EXPECTED_SUPABASE_PROJECT_REF");
    expect(verifier).toContain("/auth/v1/health");
    expect(verifier).toContain("/auth/v1/settings");
    expect(verifier).toContain("Supabase Auth email confirmation is not enforced");
    expect(verifier).toContain("Deployed Turnstile site key is empty");
    expect(remoteSupabaseVerifier).toContain("paper_revision_id");
    expect(remoteSupabaseVerifier).toContain("guest_space_already_claimed");
    expect(remoteSupabaseVerifier).toContain("get_entitled_content_resource");
    expect(remoteSupabaseVerifier).toContain("auth/v1/admin/users/${user.id}");
  });

  it("gates changes with application, database, recovery, capacity and container checks", async () => {
    const [workflow, supabaseDeployment, packageJson, performanceGate, capacityCheck] = await Promise.all([
      source(".github/workflows/verify.yml"),
      source(".github/workflows/deploy-supabase.yml"),
      source("package.json"),
      source("scripts/check-web-performance-budget.ts"),
      source("scripts/load-test-beta-local.ts"),
    ]);

    expect(workflow).toContain("pnpm verify");
    expect(workflow).toContain("pnpm verify:supabase");
    expect(workflow).toContain("pnpm verify:recovery-local");
    expect(workflow).toContain("pnpm verify:beta-load-local");
    expect(workflow).toContain("pnpm verify:deployment");
    expect(workflow).toContain('BETA_LOAD_USERS: "100"');
    expect(packageJson).toContain("pnpm build && pnpm verify:web-performance");
    expect(performanceGate).toContain("entryJavascriptGzipBytes");
    expect(performanceGate).toContain("initialJavascriptAndCssGzipBytes");
    expect(performanceGate).toContain("nonEntryJavascriptBytes");
    expect(capacityCheck).toContain(
      'const capacityFeedbackMessage = "Capacity exercise feedback marker.";',
    );
    expect(capacityCheck).toContain("p_message: capacityFeedbackMessage");
    expect(capacityCheck).not.toContain("Capacity feedback marker ${suffix}");
    expect(supabaseDeployment).toContain("pnpm supabase:migrations:plan");
    expect(supabaseDeployment).toContain("pnpm supabase:migrations:apply");
    expect(supabaseDeployment).not.toContain("SUPABASE_DB_PASSWORD");
    expect(supabaseDeployment).toContain("pnpm supabase:auth-protection:apply");
    expect(supabaseDeployment).toContain("secrets.TURNSTILE_SECRET_KEY");
    expect(supabaseDeployment).toContain("supabase functions deploy invite-preview");
    expect(supabaseDeployment).toContain("ALLOWED_ORIGINS=$PUBLIC_APP_ORIGIN");
  });

  it("uses Node 24 actions and avoids duplicate branch and pull-request verification", async () => {
    const workflowPaths = [
      ".github/workflows/verify.yml",
      ".github/workflows/deploy-supabase.yml",
      ".github/workflows/release-image.yml",
      ".github/workflows/deployment-smoke.yml",
    ];
    const workflows = await Promise.all(workflowPaths.map(source));

    for (const workflow of workflows) {
      expect(workflow).toContain("actions/checkout@v7");
      expect(workflow).toContain("pnpm/action-setup@v6");
      expect(workflow).toContain("actions/setup-node@v7");
      expect(workflow).not.toMatch(/@(v4|v5)(?:\s|$)/u);
    }
    expect(workflows[0]).not.toContain('"codex/**"');
  });

  it("continuously checks the real deployed URL without creating accounts or consuming invites", async () => {
    const [workflow, config, smoke] = await Promise.all([
      source(".github/workflows/deployment-smoke.yml"),
      source("playwright.deployment.config.ts"),
      source("tests/e2e/deployment-smoke.spec.ts"),
    ]);

    expect(workflow).toContain('cron: "17 2,14 * * *"');
    expect(workflow).toContain("pnpm verify:deployment");
    expect(workflow).toContain("pnpm verify:e2e:deployment");
    expect(workflow).toContain("vars.PUBLIC_APP_ORIGIN");
    expect(config).toContain('testMatch: "deployment-smoke.spec.ts"');
    expect(config).not.toContain("webServer");
    expect(smoke).toContain("TMUA AP profile produces coverage");
    expect(smoke).not.toMatch(/redeemInvite|create账号并解锁/u);
  });

  it("keeps the browser fixture delivery explicit and isolated from production builds", async () => {
    const [config, resolver] = await Promise.all([
      source("playwright.config.ts"),
      source("src/features/practice/delivery/resolve-service.ts"),
    ]);

    expect(config).toContain("vite --mode test");
    expect(config).toContain('VITE_SUPABASE_URL: ""');
    expect(config).toContain('VITE_SUPABASE_PUBLISHABLE_KEY: ""');
    expect(resolver).toContain('import.meta.env.MODE !== "test"');
    expect(resolver).toContain('import("./test-practice-delivery-service.js")');
  });

  it("keeps production auth bot protection automated and fail-closed", async () => {
    const [packageJson, configurator, runtime] = await Promise.all([
      source("package.json"),
      source("scripts/configure-supabase-auth-protection.ts"),
      source("src/platform/runtime-config.ts"),
    ]);

    expect(packageJson).toContain("supabase:auth-protection:check");
    expect(packageJson).toContain("supabase:auth-protection:apply");
    expect(configurator).toContain("security_captcha_enabled");
    expect(configurator).toContain("security_captcha_provider");
    expect(configurator).not.toMatch(/console\.log\([^\n]*TURNSTILE_SECRET_KEY/u);
    expect(runtime).toContain('environment === "staging" || environment === "production"');
  });

  it("keeps restore tooling non-production by default and integrity checks every file", async () => {
    const [backup, restore] = await Promise.all([
      source("scripts/backup-supabase-logical.sh"),
      source("scripts/restore-supabase-logical.sh"),
    ]);

    expect(backup).toContain("manifest.sha256");
    expect(backup).toContain("--role-only");
    expect(backup).toContain("--data-only");
    expect(restore).toContain("RESTORE_TO_NEW_NON_PRODUCTION_PROJECT");
    expect(restore).toContain("Source and target database URLs must not match");
    expect(restore).toContain("--single-transaction");
    expect(restore).toContain("ON_ERROR_STOP=1");
  });
});
