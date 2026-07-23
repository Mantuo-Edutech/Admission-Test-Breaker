import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseProductionEvidenceCatalog } from "../../src/platform/production-evidence-ledger.js";
import {
  parseManualProductionControlReport,
  parseManualProductionProcedureCatalog,
  validateManualProductionControlReport,
  type ManualProductionControlReport,
} from "../../src/platform/production-manual-evidence.js";

const release = "a".repeat(40);

async function catalogs() {
  const [evidenceSource, procedureSource] = await Promise.all([
    readFile("verification/production/control-catalog.json", "utf8"),
    readFile("verification/production/manual-control-procedures.json", "utf8"),
  ]);
  return {
    evidence: parseProductionEvidenceCatalog(JSON.parse(evidenceSource)),
    procedures: parseManualProductionProcedureCatalog(JSON.parse(procedureSource)),
  };
}

async function identityReport(): Promise<ManualProductionControlReport> {
  const { evidence, procedures } = await catalogs();
  const procedure = procedures.procedures.find(
    (candidate) => candidate.controlId === "identity-journey-uat",
  )!;
  return {
    schemaVersion: 1,
    controlId: procedure.controlId,
    target: evidence.target,
    release,
    executedAt: "2026-07-24T12:00:00.000Z",
    checks: procedure.checks.map((check) => ({
      id: check.id,
      result: "passed",
      evidenceSummary: `Observed ${check.id} on the approved production browser with the expected outcome.`,
    })),
  };
}

describe("manual production evidence", () => {
  it("defines an exact procedure for every manual production control", async () => {
    const { evidence, procedures } = await catalogs();
    const manualControlIds = evidence.controls
      .filter((control) => control.method === "manual")
      .map((control) => control.id)
      .sort();
    expect(procedures.procedures.map((procedure) => procedure.controlId).sort())
      .toEqual(manualControlIds);
    expect(procedures.procedures.every((procedure) => procedure.checks.length >= 4)).toBe(true);
  });

  it("accepts a complete report bound to the exact target and release", async () => {
    const { evidence, procedures } = await catalogs();
    const control = evidence.controls.find((candidate) => candidate.id === "identity-journey-uat")!;
    const report = parseManualProductionControlReport(await identityReport());
    expect(() => validateManualProductionControlReport({
      catalog: procedures,
      control,
      report,
      expectedTarget: evidence.target,
      expectedRelease: release,
      expectedResult: "passed",
    })).not.toThrow();
  });

  it("rejects missing, duplicate or unexpected checks", async () => {
    const { evidence, procedures } = await catalogs();
    const control = evidence.controls.find((candidate) => candidate.id === "identity-journey-uat")!;
    const complete = await identityReport();
    const missing = parseManualProductionControlReport({
      ...complete,
      checks: complete.checks.slice(1),
    });
    expect(() => validateManualProductionControlReport({
      catalog: procedures,
      control,
      report: missing,
      expectedTarget: evidence.target,
      expectedRelease: release,
      expectedResult: "passed",
    })).toThrow("exact required checks");

    expect(() => parseManualProductionControlReport({
      ...complete,
      checks: [...complete.checks, complete.checks[0]],
    })).toThrow("duplicate check ids");
  });

  it("derives the result from every check instead of trusting the command line", async () => {
    const { evidence, procedures } = await catalogs();
    const control = evidence.controls.find((candidate) => candidate.id === "identity-journey-uat")!;
    const complete = await identityReport();
    const failed = parseManualProductionControlReport({
      ...complete,
      checks: complete.checks.map((check, index) => index === 0
        ? { ...check, result: "failed" }
        : check),
    });
    expect(() => validateManualProductionControlReport({
      catalog: procedures,
      control,
      report: failed,
      expectedTarget: evidence.target,
      expectedRelease: release,
      expectedResult: "passed",
    })).toThrow("derives failed, not passed");
  });

  it("rejects the wrong release and sensitive evidence", async () => {
    const { evidence, procedures } = await catalogs();
    const control = evidence.controls.find((candidate) => candidate.id === "identity-journey-uat")!;
    const complete = await identityReport();
    const wrongRelease = parseManualProductionControlReport({ ...complete, release: "b".repeat(40) });
    expect(() => validateManualProductionControlReport({
      catalog: procedures,
      control,
      report: wrongRelease,
      expectedTarget: evidence.target,
      expectedRelease: release,
      expectedResult: "passed",
    })).toThrow("release does not match");

    expect(() => parseManualProductionControlReport({
      ...complete,
      checks: complete.checks.map((check, index) => index === 0
        ? { ...check, evidenceSummary: "Confirmed with student@example.test in production." }
        : check),
    })).toThrow("must not contain credentials");
  });
});
