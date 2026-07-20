import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  buildSupabaseCiLayout,
  rewriteSupabaseConfigForCi,
} from "../../scripts/lib/supabase-ci-config.js";

describe("Supabase CI isolation", () => {
  it("assigns every host service a unique non-default port block", async () => {
    const source = await readFile("supabase/config.toml", "utf8");
    const layout = buildSupabaseCiLayout("29731136378", "2");
    const rewritten = rewriteSupabaseConfigForCi(source, layout);
    const ports = Object.values(layout.ports);

    expect(layout.projectId).toBe("atb-ci-29731136378-2");
    expect(new Set(ports).size).toBe(ports.length);
    expect(ports.every((port) => port >= 20_000 && port < 31_200)).toBe(true);
    expect(rewritten).toContain(`project_id = "${layout.projectId}"`);
    for (const port of ports) expect(rewritten).toContain(`= ${port}`);
    expect(rewritten).not.toContain("port = 54322");
  });

  it("moves a rerun away from the previous attempt's ports", () => {
    const first = buildSupabaseCiLayout("29731136378", "1");
    const second = buildSupabaseCiLayout("29731136378", "2");

    expect(second.projectId).not.toBe(first.projectId);
    expect(new Set(Object.values(second.ports))).not.toEqual(new Set(Object.values(first.ports)));
  });

  it("fails closed for malformed GitHub run coordinates", () => {
    expect(() => buildSupabaseCiLayout("run-12", "1")).toThrow("GITHUB_RUN_ID");
    expect(() => buildSupabaseCiLayout("12", "0")).toThrow("at least 1");
  });

  it("prepares isolation before start and preserves unconditional cleanup", async () => {
    const workflow = await readFile(".github/workflows/verify.yml", "utf8");
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["supabase:prepare-ci"]).toBe(
      "tsx scripts/prepare-supabase-ci-config.ts",
    );
    expect(workflow.indexOf("pnpm supabase:prepare-ci")).toBeGreaterThan(-1);
    expect(workflow.indexOf("pnpm supabase:prepare-ci")).toBeLessThan(
      workflow.indexOf("pnpm supabase:start"),
    );
    expect(workflow).toContain("pnpm exec supabase stop --all --no-backup || true");
    expect(workflow).toContain("if: always()");
    expect(workflow).toContain("pnpm exec supabase stop --no-backup");
  });
});
