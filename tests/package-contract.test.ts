import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("package contract", () => {
  it("declares Node versions supported by the locked direct toolchain", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe("^22.13.0 || >=24.0.0");
  });

  it("exposes independent architecture and feature verification layers", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["verify:architecture"]).toBeDefined();
    expect(packageJson.scripts?.["verify:features"]).toBeDefined();
    expect(packageJson.scripts?.["verify:supabase-contracts"]).toBeDefined();
    expect(packageJson.scripts?.["verify:supabase"]).toBeDefined();
    expect(packageJson.scripts?.verify).toContain("pnpm verify:architecture");
    expect(packageJson.scripts?.verify).toContain("pnpm verify:features");
    expect(packageJson.scripts?.verify).toContain("pnpm verify:supabase-contracts");
  });
});
