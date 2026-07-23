import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Supabase project selection contract", () => {
  it("keeps discovery and selection planning read-only and secret-free", async () => {
    const [script, packageJsonText, gitignore] = await Promise.all([
      readFile("scripts/plan-supabase-projects.ts", "utf8"),
      readFile("package.json", "utf8"),
      readFile(".gitignore", "utf8"),
    ]);
    const packageJson = JSON.parse(packageJsonText) as { scripts: Record<string, string> };

    expect(script).toContain('["projects", "list", "--output", "json", "--agent", "no"]');
    expect(script).not.toMatch(/projects["',\s]+(?:create|delete|pause|restore)/u);
    expect(script).not.toContain("--db-password");
    expect(script).not.toContain("SUPABASE_ACCESS_TOKEN");
    expect(script).not.toContain("SERVICE_ROLE_KEY");
    expect(packageJson.scripts["production:supabase-inventory"]).toContain(
      "plan-supabase-projects.ts",
    );
    expect(packageJson.scripts["production:supabase-plan"]).toContain(
      "plan-supabase-projects.ts",
    );
    expect(gitignore).toContain("deploy/supabase-project-selection.local.json");
  });
});
