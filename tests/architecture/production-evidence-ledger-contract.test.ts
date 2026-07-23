import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseProductionEvidenceCatalog } from "../../src/platform/production-evidence-ledger.js";

describe("production evidence architecture contract", () => {
  it("maps every non-repository P0 gate to explicit automated and manual controls", async () => {
    const catalog = parseProductionEvidenceCatalog(JSON.parse(
      await readFile("verification/production/control-catalog.json", "utf8"),
    ));
    for (const gate of ["B100-P0-01", "B100-P0-02", "B100-P0-03", "B100-P0-04", "B100-P0-05"] as const) {
      expect(catalog.controls.some((control) => control.gates.includes(gate))).toBe(true);
    }
    expect(catalog.controls.some((control) => control.method === "automated")).toBe(true);
    expect(catalog.controls.some((control) => control.method === "manual")).toBe(true);
    expect(catalog.target).toEqual({
      environment: "production",
      origin: "https://uktest.cc",
      supabaseProjectRef: "wmhqqxmzxiojrxybqjij",
    });
  });

  it("makes the beta gate consume source-bound evidence without automating human approval", async () => {
    const [packageJson, betaAudit, recorder, readme] = await Promise.all([
      readFile("package.json", "utf8"),
      readFile("scripts/check-beta-readiness.ts", "utf8"),
      readFile("scripts/record-production-evidence.ts", "utf8"),
      readFile("verification/production/evidence/README.md", "utf8"),
    ]);
    expect(packageJson).toContain("production:evidence:audit");
    expect(packageJson).toContain("production:evidence:gate");
    expect(packageJson).toContain("production:evidence:record-manual");
    expect(betaAudit).toContain("auditProductionEvidence");
    expect(recorder).toContain("I_COMPLETED_THIS_PRODUCTION_CONTROL");
    expect(recorder).toContain("sourceFingerprint");
    expect(recorder).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(readme).toContain("do not hand-edit");
  });
});
