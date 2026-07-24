import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Turnstile bootstrap contract", () => {
  it("keeps planning offline and requires an explicit apply confirmation", async () => {
    const [script, packageJsonText] = await Promise.all([
      readFile("scripts/configure-cloudflare-turnstile.ts", "utf8"),
      readFile("package.json", "utf8"),
    ]);
    const packageJson = JSON.parse(packageJsonText) as { scripts: Record<string, string> };

    expect(script.indexOf('if (mode === "dry-run") process.exit(0)'))
      .toBeLessThan(script.indexOf("requiredSecretEnvironment(plan.accountIdEnvironmentVariable)"));
    expect(script).toContain("TURNSTILE_BOOTSTRAP_CONFIRMATION");
    expect(script).toContain('argument("--confirm")');
    expect(packageJson.scripts["production:turnstile-plan"]).not.toContain("--check");
    expect(packageJson.scripts["production:turnstile-check"]).toContain("--check");
    expect(packageJson.scripts["production:turnstile-apply"]).toContain("--apply");
  });

  it("uses the official widget API and delivers secrets only through child stdin", async () => {
    const script = await readFile("scripts/configure-cloudflare-turnstile.ts", "utf8");
    expect(script).toContain("https://api.cloudflare.com/client/v4");
    expect(script).toContain(
      'new URL(`accounts/${account}/challenges/widgets${suffix}`, CLOUDFLARE_API_ORIGIN)',
    );
    expect(script).not.toContain('new URL(`/accounts/${account}/challenges/widgets${suffix}`');
    expect(script).toContain("/challenges/widgets");
    expect(script).toContain('method: "POST"');
    expect(script).toContain('method: "PUT"');
    expect(script).toContain('child.stdin.end(`${secret}\\n`)');
    expect(script).toContain('{ stdio: ["pipe", "ignore", "ignore"] }');
    expect(script).toContain('"TURNSTILE_SITE_KEY", "--body", sitekey');
    expect(script).toContain('"TURNSTILE_SECRET_KEY"');
    expect(script).not.toMatch(
      /console\.(?:log|error)\([^\n]*(?:process\.env|widgetSecret\(|requiredSecretEnvironment\(|Authorization)/u,
    );
  });

  it("requires isolated production site keys and secret names in both environments", async () => {
    const requirements = JSON.parse(
      await readFile("deploy/bootstrap-requirements.json", "utf8"),
    ) as { environments: Array<{ requiredSecrets: string[]; requiredVariables: string[] }> };
    for (const environment of requirements.environments) {
      expect(environment.requiredVariables).toContain("TURNSTILE_SITE_KEY");
      expect(environment.requiredSecrets).toContain("TURNSTILE_SECRET_KEY");
    }
  });
});
