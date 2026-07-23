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
    const [packageJson, betaAudit, recorder, readme, procedures] = await Promise.all([
      readFile("package.json", "utf8"),
      readFile("scripts/check-beta-readiness.ts", "utf8"),
      readFile("scripts/record-production-evidence.ts", "utf8"),
      readFile("verification/production/evidence/README.md", "utf8"),
      readFile("verification/production/manual-control-procedures.json", "utf8"),
    ]);
    expect(packageJson).toContain("production:evidence:audit");
    expect(packageJson).toContain("production:evidence:gate");
    expect(packageJson).toContain("production:evidence:record-manual");
    expect(packageJson).toContain("production:evidence:prepare-manual");
    expect(betaAudit).toContain("auditProductionEvidence");
    expect(recorder).toContain("I_COMPLETED_THIS_PRODUCTION_CONTROL");
    expect(recorder).toContain("sourceFingerprint");
    expect(recorder).toContain("validateManualProductionControlReport");
    expect(recorder).toContain("--report");
    expect(recorder).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(readme).toContain("do not hand-edit");
    expect(procedures).toContain("identity-journey-uat");
    expect(procedures).toContain("managed-recovery-drill");
  });

  it("binds every manual control to the structured UAT procedure and validator", async () => {
    const catalog = parseProductionEvidenceCatalog(JSON.parse(
      await readFile("verification/production/control-catalog.json", "utf8"),
    ));
    for (const control of catalog.controls.filter((candidate) => candidate.method === "manual")) {
      expect(control.sourcePaths).toContain("src/platform/production-manual-evidence.ts");
      expect(control.sourcePaths).toContain(
        "verification/production/manual-control-procedures.json",
      );
    }
  });

  it("binds privacy approval to a complete independent-review packet", async () => {
    const [catalogSource, packet, attestation] = await Promise.all([
      readFile("verification/production/control-catalog.json", "utf8"),
      readFile("docs/legal/PRODUCTION_PRIVACY_REVIEW_PACKET.md", "utf8"),
      readFile("verification/production/templates/privacy-legal-review-attestation.md", "utf8"),
    ]);
    const catalog = parseProductionEvidenceCatalog(JSON.parse(catalogSource));
    const control = catalog.controls.find((item) => item.id === "privacy-legal-review");

    expect(control?.method).toBe("manual");
    expect(control?.sourcePaths).toContain("docs/legal/PRODUCTION_PRIVACY_REVIEW_PACKET.md");
    expect(control?.sourcePaths).toContain(
      "verification/production/templates/privacy-legal-review-attestation.md",
    );
    for (let index = 1; index <= 12; index += 1) {
      const decisionId = `PRIV-${String(index).padStart(2, "0")}`;
      expect(packet).toContain(decisionId);
      expect(attestation).toContain(decisionId);
    }
    expect(packet).toContain("It is not");
    expect(attestation).toContain("No unresolved launch-blocking");
  });
});
