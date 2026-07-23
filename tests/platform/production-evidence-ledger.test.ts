import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  assessProductionEvidence,
  parseProductionEvidenceCatalog,
  parseProductionEvidenceRecord,
  productionControlSourceFingerprint,
  type ProductionEvidenceCatalog,
  type ProductionEvidenceRecord,
} from "../../src/platform/production-evidence-ledger.js";

const release = "a".repeat(40);
const fingerprint = "b".repeat(64);
const outputSha = "c".repeat(64);
const artifactSha = "d".repeat(64);
const now = new Date("2026-07-24T12:00:00.000Z");

async function catalog(): Promise<ProductionEvidenceCatalog> {
  return parseProductionEvidenceCatalog(JSON.parse(
    await readFile("verification/production/control-catalog.json", "utf8"),
  ));
}

function evidenceFor(
  control: ProductionEvidenceCatalog["controls"][number],
  overrides: Partial<ProductionEvidenceRecord> = {},
): ProductionEvidenceRecord {
  const common = {
    schemaVersion: 1 as const,
    controlId: control.id,
    method: control.method,
    result: "passed" as const,
    target: {
      environment: "production" as const,
      origin: "https://uktest.cc",
      supabaseProjectRef: "wmhqqxmzxiojrxybqjij",
    },
    release: control.scope === "release" ? release : null,
    observedAt: "2026-07-24T11:30:00.000Z",
    sourceFingerprint: fingerprint,
    summary: `${control.label} has valid production evidence.`,
    artifacts: control.method === "manual"
      ? [{ path: "verification/production/evidence/artifacts/redacted.txt", sha256: artifactSha }]
      : [],
  };
  const methodFields = control.method === "automated"
    ? {
      command: {
        program: control.command!.program,
        args: control.command!.args,
        outputSha256: outputSha,
        outputBytes: 128,
      },
    }
    : {
      reviewer: {
        reviewerRef: "qualified-reviewer-01",
        role: "approved production reviewer",
        attestation: "I_COMPLETED_THIS_PRODUCTION_CONTROL" as const,
      },
    };
  return { ...common, ...methodFields, ...overrides } as ProductionEvidenceRecord;
}

describe("production evidence ledger", () => {
  it("derives all six P0 gates only from current matching evidence and repository proof", async () => {
    const controlCatalog = await catalog();
    const sourceFingerprints = Object.fromEntries(
      controlCatalog.controls.map((control) => [control.id, fingerprint]),
    );
    const assessment = assessProductionEvidence({
      catalog: controlCatalog,
      records: controlCatalog.controls.map((control) => evidenceFor(control)),
      sourceFingerprints,
      repositoryVerifiedGates: ["B100-P0-06"],
      expectedRelease: release,
      now,
    });

    expect(assessment.ready).toBe(true);
    expect(assessment.verifiedGateCount).toBe(6);
    expect(assessment.gates.find((gate) => gate.id === "B100-P0-06")?.source).toBe("repository");
    expect(assessment.gates.find((gate) => gate.id === "B100-P0-01")?.source).toBe("production-evidence");
  });

  it("invalidates evidence after a failure, source change, release change or expiry", async () => {
    const controlCatalog = await catalog();
    const deployment = controlCatalog.controls.find((control) => control.id === "deployment-runtime")!;
    const baseFingerprints = Object.fromEntries(
      controlCatalog.controls.map((control) => [control.id, fingerprint]),
    );
    const baseRecords = controlCatalog.controls.map((control) => evidenceFor(control));
    const latestFailure = evidenceFor(deployment, {
      result: "failed",
      observedAt: "2026-07-24T11:45:00.000Z",
      summary: "The latest deployed runtime verification failed.",
    });

    const failed = assessProductionEvidence({
      catalog: controlCatalog,
      records: [...baseRecords, latestFailure],
      sourceFingerprints: baseFingerprints,
      repositoryVerifiedGates: ["B100-P0-06"],
      expectedRelease: release,
      now,
    });
    expect(failed.controls.find((control) => control.id === deployment.id)?.reason).toBe("最近一次验证失败");
    expect(failed.ready).toBe(false);

    const drifted = assessProductionEvidence({
      catalog: controlCatalog,
      records: baseRecords,
      sourceFingerprints: { ...baseFingerprints, [deployment.id]: "e".repeat(64) },
      repositoryVerifiedGates: ["B100-P0-06"],
      expectedRelease: release,
      now,
    });
    expect(drifted.controls.find((control) => control.id === deployment.id)?.reason).toBe("控制代码或配置已变化");

    const wrongRelease = assessProductionEvidence({
      catalog: controlCatalog,
      records: baseRecords,
      sourceFingerprints: baseFingerprints,
      repositoryVerifiedGates: ["B100-P0-06"],
      expectedRelease: "f".repeat(40),
      now,
    });
    expect(wrongRelease.controls.find((control) => control.id === deployment.id)?.reason).toBe("证据不属于待发布 release");

    const expired = assessProductionEvidence({
      catalog: controlCatalog,
      records: baseRecords,
      sourceFingerprints: baseFingerprints,
      repositoryVerifiedGates: ["B100-P0-06"],
      expectedRelease: release,
      now: new Date("2026-07-26T12:00:00.000Z"),
    });
    expect(expired.controls.find((control) => control.id === deployment.id)?.reason).toBe("证据已过期");
  });

  it("requires exact manual attestation and rejects credentials or personal email", () => {
    const base = {
      schemaVersion: 1,
      controlId: "identity-journey-uat",
      method: "manual",
      result: "passed",
      target: {
        environment: "production",
        origin: "https://uktest.cc",
        supabaseProjectRef: "wmhqqxmzxiojrxybqjij",
      },
      release,
      observedAt: now.toISOString(),
      sourceFingerprint: fingerprint,
      summary: "Real-device identity journey completed successfully.",
      reviewer: {
        reviewerRef: "reviewer-01",
        role: "production reviewer",
        attestation: "NOT_REALLY_COMPLETED",
      },
      artifacts: [{
        path: "verification/production/evidence/artifacts/identity-uat.txt",
        sha256: artifactSha,
      }],
    };
    expect(() => parseProductionEvidenceRecord(base)).toThrow("exact attestation");
    expect(() => parseProductionEvidenceRecord({
      ...base,
      summary: "Contact student@example.test for the UAT evidence.",
    })).toThrow("must not contain credentials");
  });

  it("does not allow a static readiness label to bypass production controls", async () => {
    const controlCatalog = await catalog();
    expect(() => assessProductionEvidence({
      catalog: controlCatalog,
      records: [],
      sourceFingerprints: Object.fromEntries(
        controlCatalog.controls.map((control) => [control.id, fingerprint]),
      ),
      repositoryVerifiedGates: ["B100-P0-01"],
      now,
    })).toThrow("cannot be verified by a static repository label");
  });

  it("binds a control fingerprint to its catalog definition and source bytes", async () => {
    const controlCatalog = await catalog();
    const control = controlCatalog.controls[0]!;
    const first = await productionControlSourceFingerprint(
      controlCatalog,
      control,
      async (sourcePath) => `first:${sourcePath}`,
    );
    const second = await productionControlSourceFingerprint(
      controlCatalog,
      control,
      async (sourcePath) => `second:${sourcePath}`,
    );
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(second).not.toBe(first);
  });
});
