import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string): Promise<string> {
  return readFile(path, "utf8");
}

describe("Supabase managed backup production contract", () => {
  it("uses the official read-only backup inventory endpoint without restore mutations", async () => {
    const [script, packageJson] = await Promise.all([
      source("scripts/verify-supabase-managed-backups.ts"),
      source("package.json"),
    ]);

    expect(script).toContain("https://api.supabase.com");
    expect(script).toContain("/database/backups");
    expect(script).toContain("SUPABASE_ACCESS_TOKEN");
    expect(script).toContain("SUPABASE_PROJECT_REF");
    expect(script).not.toContain("restore-pitr");
    expect(script).not.toMatch(/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/u);
    expect(script).not.toMatch(/console\.(?:log|error)\([^\n]*(?:token|SUPABASE_ACCESS_TOKEN)/iu);
    expect(packageJson).toContain("supabase:managed-backups:check");
  });

  it("runs before production database mutation and is not required for staging", async () => {
    const workflow = await source(".github/workflows/deploy-supabase.yml");
    const gate = workflow.indexOf("Require recent production restore point");
    const migration = workflow.indexOf("Apply reviewed migrations");

    expect(gate).toBeGreaterThan(-1);
    expect(migration).toBeGreaterThan(gate);
    expect(workflow).toContain("inputs.environment == 'production'");
    expect(workflow).toContain("pnpm supabase:managed-backups:check");
    expect(workflow).toContain("secrets.SUPABASE_ACCESS_TOKEN");
    expect(workflow).toContain("secrets.SUPABASE_PROJECT_REF");
  });
});
