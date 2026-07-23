import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  parseManualProductionProcedureCatalog,
  type ManualProductionControlReport,
} from "../src/platform/production-manual-evidence.js";
import { loadProductionEvidenceCatalog } from "./lib/production-evidence.js";

const PROCEDURE_CATALOG_PATH = "verification/production/manual-control-procedures.json";
const ARTIFACT_DIRECTORY = "verification/production/evidence/artifacts";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function requiredArgument(name: string): string {
  const value = argument(name)?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function releaseFor(scope: "release" | "environment"): string | null {
  if (scope === "environment") return null;
  const value = process.env.PRODUCTION_EVIDENCE_RELEASE?.trim();
  if (!value || !/^[a-f0-9]{40}$/u.test(value)) {
    throw new Error("PRODUCTION_EVIDENCE_RELEASE must be a full lowercase commit SHA");
  }
  return value;
}

const outputPath = requiredArgument("--output");
if (
  !outputPath.startsWith(`${ARTIFACT_DIRECTORY}/`)
  || path.extname(outputPath) !== ".json"
  || outputPath.split(/[\\/]/u).includes("..")
) {
  throw new Error(`--output must be a JSON file inside ${ARTIFACT_DIRECTORY}/`);
}

const evidenceCatalog = await loadProductionEvidenceCatalog();
const controlId = requiredArgument("--control");
const control = evidenceCatalog.controls.find((candidate) => candidate.id === controlId);
if (control === undefined) throw new Error(`Unknown production control: ${controlId}`);
if (control.method !== "manual") throw new Error(`${controlId} is not a manual control`);

const procedureCatalog = parseManualProductionProcedureCatalog(JSON.parse(
  await readFile(PROCEDURE_CATALOG_PATH, "utf8"),
));
const procedure = procedureCatalog.procedures.find((candidate) => candidate.controlId === controlId);
if (procedure === undefined) throw new Error(`${controlId} has no manual procedure`);

const report: ManualProductionControlReport = {
  schemaVersion: 1,
  controlId,
  target: evidenceCatalog.target,
  release: releaseFor(control.scope),
  executedAt: new Date().toISOString(),
  checks: procedure.checks.map((check) => ({
    id: check.id,
    result: "failed",
    evidenceSummary: `NOT EXECUTED — replace with privacy-safe observed evidence for: ${check.label}`,
  })),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
console.log(`Manual control report prepared: ${outputPath}`);
console.log("All checks are failed by default. Change a check to passed only after observing it in production.");
