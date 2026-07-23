import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("production bootstrap contract", () => {
  it("keeps the preflight read-only and never reads or prints secret values", async () => {
    const script = await readFile("scripts/check-production-bootstrap.ts", "utf8");
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(script).toContain("environments/${name}/secrets");
    expect(script).not.toContain("process.env.SUPABASE_ACCESS_TOKEN");
    expect(script).not.toContain("process.env.SUPABASE_DB_PASSWORD");
    expect(script).not.toMatch(/gh\W+secret\W+set/iu);
    expect(script).not.toMatch(/--method\W+(?:PUT|POST|PATCH|DELETE)/iu);
    expect(packageJson.scripts["production:preflight"]).toBe(
      "tsx scripts/check-production-bootstrap.ts",
    );
    expect(packageJson.scripts["production:bootstrap-gate"]).toContain(
      "--require-github-setup",
    );
    expect(packageJson.scripts["production:release-candidate-gate"]).toContain(
      "--require-release-candidate",
    );
    expect(packageJson.scripts.verify).toContain("verify:production-bootstrap");
  });

  it("keeps bootstrap apply opt-in and pipes secret values through stdin", async () => {
    const script = await readFile("scripts/apply-production-bootstrap.ts", "utf8");
    const gitignore = await readFile(".gitignore", "utf8");
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(script).toContain('process.argv.includes("--apply")');
    expect(script).toContain('argument("--confirm")');
    expect(script).toContain('child.stdin.end(`${secret}\\n`)');
    expect(script).toContain('{ stdio: ["pipe", "ignore", "ignore"] }');
    expect(script).not.toContain("process.env.SUPABASE_ACCESS_TOKEN");
    expect(script).not.toContain("process.env.SUPABASE_DB_PASSWORD");
    expect(script).not.toMatch(/console\.(?:log|error)\([^\n]*(?:secretValues|process\.env)/u);
    expect(gitignore).toContain("deploy/bootstrap-input.local.json");
    expect(packageJson.scripts["production:bootstrap-plan"]).toContain(
      "apply-production-bootstrap.ts",
    );
    expect(packageJson.scripts["production:bootstrap-apply"]).toContain("--apply");
  });
});
