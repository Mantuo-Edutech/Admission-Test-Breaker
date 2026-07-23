import { execFile as execFileCallback, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  assertProductionEvidenceWorkspace,
  parseProductionEvidenceRecord,
  productionControlSourceFingerprint,
  productionTargetEnvironment,
  sha256Text,
  type ProductionEvidenceArtifact,
  type ProductionEvidenceRecord,
} from "../src/platform/production-evidence-ledger.js";
import {
  parseManualProductionControlReport,
  parseManualProductionProcedureCatalog,
  validateManualProductionControlReport,
} from "../src/platform/production-manual-evidence.js";
import {
  loadProductionEvidenceCatalog,
  PRODUCTION_EVIDENCE_DIRECTORY,
} from "./lib/production-evidence.js";

const execFile = promisify(execFileCallback);

const MANUAL_PROCEDURE_CATALOG_PATH =
  "verification/production/manual-control-procedures.json";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function argumentsFor(name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1] !== undefined) {
      values.push(process.argv[index + 1]!);
    }
  }
  return values;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") throw new Error(`${name} is required`);
  return value;
}

function fullRelease(controlScope: "release" | "environment"): string | null {
  if (controlScope === "environment") return null;
  const release = requiredEnvironment("PRODUCTION_EVIDENCE_RELEASE").trim();
  if (!/^[a-f0-9]{40}$/u.test(release)) {
    throw new Error("PRODUCTION_EVIDENCE_RELEASE must be a full lowercase commit SHA");
  }
  return release;
}

async function commandResult(
  program: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(program, [...args], { env: environment, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const receive = (chunk: Buffer, stream: NodeJS.WriteStream): void => {
      stream.write(chunk);
      if (output.length < 1_000_000) output += chunk.toString("utf8").slice(0, 1_000_000 - output.length);
    };
    child.stdout.on("data", (chunk: Buffer) => receive(chunk, process.stdout));
    child.stderr.on("data", (chunk: Buffer) => receive(chunk, process.stderr));
    child.once("error", reject);
    child.once("close", (code) => resolve({ exitCode: code ?? 1, output }));
  });
}

function evidenceFileName(controlId: string, observedAt: string): string {
  return `${observedAt.replace(/[:.]/gu, "-")}--${controlId}.json`;
}

async function writeEvidence(record: ProductionEvidenceRecord): Promise<string> {
  const parsed = parseProductionEvidenceRecord(record);
  await mkdir(PRODUCTION_EVIDENCE_DIRECTORY, { recursive: true });
  const outputPath = path.join(
    PRODUCTION_EVIDENCE_DIRECTORY,
    evidenceFileName(parsed.controlId, parsed.observedAt),
  );
  await writeFile(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, { flag: "wx" });
  return outputPath;
}

async function assertEvidenceWorkspace(
  scope: "release" | "environment",
  release: string | null,
): Promise<void> {
  const [head, status] = await Promise.all([
    execFile("git", ["rev-parse", "HEAD"], { encoding: "utf8" }),
    execFile("git", ["status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" }),
  ]);
  assertProductionEvidenceWorkspace({
    scope,
    release,
    head: head.stdout.trim(),
    porcelainStatus: status.stdout,
  });
}

const controlId = argument("--control");
if (controlId === undefined) throw new Error("--control is required");
const catalog = await loadProductionEvidenceCatalog();
const control = catalog.controls.find((item) => item.id === controlId);
if (control === undefined) throw new Error(`Unknown production evidence control: ${controlId}`);
if (process.argv.includes("--automated-only") && control.method !== "automated") {
  throw new Error(`${controlId} requires the manual evidence recorder`);
}
if (process.argv.includes("--manual-only") && control.method !== "manual") {
  throw new Error(`${controlId} requires the automated evidence runner`);
}
const release = fullRelease(control.scope);
await assertEvidenceWorkspace(control.scope, release);
const observedAt = new Date().toISOString();
const sourceFingerprint = await productionControlSourceFingerprint(
  catalog,
  control,
  (sourcePath) => readFile(sourcePath),
);

if (control.method === "automated") {
  const command = control.command!;
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const name of command.requiredEnvironment) requiredEnvironment(name);
  for (const [name, targetValue] of Object.entries(command.targetEnvironment)) {
    environment[name] = productionTargetEnvironment(catalog.target, release ?? "", targetValue);
  }
  const result = await commandResult(command.program, command.args, environment);
  const record: ProductionEvidenceRecord = {
    schemaVersion: 1,
    controlId: control.id,
    method: "automated",
    result: result.exitCode === 0 ? "passed" : "failed",
    target: catalog.target,
    release,
    observedAt,
    sourceFingerprint,
    summary: result.exitCode === 0
      ? `${control.label} completed successfully.`
      : `${control.label} failed with exit code ${result.exitCode}.`,
    command: {
      program: command.program,
      args: command.args,
      outputSha256: sha256Text(result.output),
      outputBytes: Buffer.byteLength(result.output),
    },
    artifacts: [],
  };
  await assertEvidenceWorkspace(control.scope, release);
  console.log(`Evidence written: ${await writeEvidence(record)}`);
  if (result.exitCode !== 0) process.exitCode = result.exitCode;
} else {
  const summary = argument("--summary");
  if (summary === undefined) throw new Error("manual controls require --summary");
  const manualResult = argument("--result");
  if (manualResult !== "passed" && manualResult !== "failed") {
    throw new Error("manual controls require an exact --result passed or --result failed");
  }
  const reportPath = argument("--report");
  if (reportPath === undefined) throw new Error("manual controls require --report");
  if (!reportPath.endsWith(".json")) throw new Error("manual control --report must be JSON");
  const artifactPaths = [reportPath, ...argumentsFor("--artifact")];
  if (new Set(artifactPaths).size !== artifactPaths.length) {
    throw new Error("manual control artifacts must not be duplicated");
  }
  const procedureCatalog = parseManualProductionProcedureCatalog(JSON.parse(
    await readFile(MANUAL_PROCEDURE_CATALOG_PATH, "utf8"),
  ));
  const report = parseManualProductionControlReport(JSON.parse(
    await readFile(reportPath, "utf8"),
  ));
  validateManualProductionControlReport({
    catalog: procedureCatalog,
    control,
    report,
    expectedTarget: catalog.target,
    expectedRelease: release,
    expectedResult: manualResult,
  });
  const artifacts: ProductionEvidenceArtifact[] = [];
  for (const artifactPath of artifactPaths) {
    if (!artifactPath.startsWith("verification/production/evidence/artifacts/")) {
      throw new Error("manual artifacts must stay under verification/production/evidence/artifacts/");
    }
    artifacts.push({ path: artifactPath, sha256: sha256Text(await readFile(artifactPath)) });
  }
  const record: ProductionEvidenceRecord = {
    schemaVersion: 1,
    controlId: control.id,
    method: "manual",
    result: manualResult,
    target: catalog.target,
    release,
    observedAt,
    sourceFingerprint,
    summary,
    reviewer: {
      reviewerRef: requiredEnvironment("PRODUCTION_EVIDENCE_REVIEWER_REF"),
      role: requiredEnvironment("PRODUCTION_EVIDENCE_REVIEWER_ROLE"),
      attestation: requiredEnvironment("PRODUCTION_EVIDENCE_ATTESTATION") as "I_COMPLETED_THIS_PRODUCTION_CONTROL",
    },
    artifacts,
  };
  await assertEvidenceWorkspace(control.scope, release);
  console.log(`Evidence written: ${await writeEvidence(record)}`);
}
