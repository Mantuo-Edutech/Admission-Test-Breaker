import type {
  ProductionEvidenceControl,
  ProductionEvidenceTarget,
} from "./production-evidence-ledger.js";

export interface ManualProductionCheckDefinition {
  readonly id: string;
  readonly label: string;
}

export interface ManualProductionControlProcedure {
  readonly controlId: string;
  readonly checks: readonly ManualProductionCheckDefinition[];
}

export interface ManualProductionProcedureCatalog {
  readonly schemaVersion: 1;
  readonly revision: string;
  readonly procedures: readonly ManualProductionControlProcedure[];
}

export interface ManualProductionCheckResult {
  readonly id: string;
  readonly result: "passed" | "failed";
  readonly evidenceSummary: string;
}

export interface ManualProductionControlReport {
  readonly schemaVersion: 1;
  readonly controlId: string;
  readonly target: ProductionEvidenceTarget;
  readonly release: string | null;
  readonly executedAt: string;
  readonly checks: readonly ManualProductionCheckResult[];
}

type UnknownRecord = Record<string, unknown>;

function object(value: unknown, label: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as UnknownRecord;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function rejectSensitiveText(value: string): void {
  if (
    value.includes("@")
    || /(?:sbp_|sb_secret_|service[_-]?role|bearer\s+|password\s*[:=]|invite\s+code\s*[:=])/iu.test(value)
    || /\beyJ[A-Za-z0-9_-]{20,}\b/u.test(value)
    || /\b(?:\d{1,3}\.){3}\d{1,3}\b/u.test(value)
  ) {
    throw new Error(
      "manual production evidence must not contain credentials, email addresses, invite codes, token-like values or IP addresses",
    );
  }
}

function canonicalTarget(value: unknown, label: string): ProductionEvidenceTarget {
  const input = object(value, label);
  const environment = text(input.environment, `${label}.environment`);
  const origin = text(input.origin, `${label}.origin`);
  const supabaseProjectRef = text(input.supabaseProjectRef, `${label}.supabaseProjectRef`);
  if (environment !== "production") throw new Error(`${label}.environment must be production`);
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.origin !== origin || url.pathname !== "/") {
    throw new Error(`${label}.origin must be a canonical HTTPS origin`);
  }
  if (!/^[a-z0-9]{20}$/u.test(supabaseProjectRef)) {
    throw new Error(`${label}.supabaseProjectRef must be a hosted project reference`);
  }
  return { environment, origin, supabaseProjectRef };
}

function release(value: unknown, label: string): string | null {
  if (value === null) return null;
  const parsed = text(value, label);
  if (!/^[a-f0-9]{40}$/u.test(parsed)) throw new Error(`${label} must be a full commit SHA or null`);
  return parsed;
}

export function parseManualProductionProcedureCatalog(
  value: unknown,
): ManualProductionProcedureCatalog {
  const input = object(value, "manual production procedure catalog");
  if (input.schemaVersion !== 1) {
    throw new Error("manual production procedure catalog schemaVersion must be 1");
  }
  const revision = text(input.revision, "manual production procedure catalog revision");
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/u.test(revision)) {
    throw new Error("manual production procedure catalog revision is invalid");
  }
  if (!Array.isArray(input.procedures) || input.procedures.length === 0) {
    throw new Error("manual production procedure catalog must contain procedures");
  }
  const procedures = input.procedures.map((raw, procedureIndex): ManualProductionControlProcedure => {
    const procedure = object(raw, `procedures[${procedureIndex}]`);
    const controlId = text(procedure.controlId, `procedures[${procedureIndex}].controlId`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(controlId)) {
      throw new Error(`manual procedure ${controlId} has an invalid controlId`);
    }
    if (!Array.isArray(procedure.checks) || procedure.checks.length === 0) {
      throw new Error(`manual procedure ${controlId} must contain checks`);
    }
    const checks = procedure.checks.map((rawCheck, checkIndex): ManualProductionCheckDefinition => {
      const check = object(rawCheck, `manual procedure ${controlId} checks[${checkIndex}]`);
      const id = text(check.id, `manual procedure ${controlId} checks[${checkIndex}].id`);
      const label = text(check.label, `manual procedure ${controlId} checks[${checkIndex}].label`);
      if (!/^[A-Z][A-Z0-9]*-\d{2}$/u.test(id)) {
        throw new Error(`manual procedure ${controlId} check ${id} has an invalid id`);
      }
      if (label.length < 8 || label.length > 240) {
        throw new Error(`manual procedure ${controlId} check ${id} has an invalid label`);
      }
      return { id, label };
    });
    if (new Set(checks.map((check) => check.id)).size !== checks.length) {
      throw new Error(`manual procedure ${controlId} has duplicate check ids`);
    }
    return { controlId, checks };
  });
  if (new Set(procedures.map((procedure) => procedure.controlId)).size !== procedures.length) {
    throw new Error("manual production procedure control ids must be unique");
  }
  return { schemaVersion: 1, revision, procedures };
}

export function parseManualProductionControlReport(
  value: unknown,
): ManualProductionControlReport {
  rejectSensitiveText(JSON.stringify(value));
  const input = object(value, "manual production control report");
  if (input.schemaVersion !== 1) {
    throw new Error("manual production control report schemaVersion must be 1");
  }
  const controlId = text(input.controlId, "manual production control report controlId");
  const target = canonicalTarget(input.target, "manual production control report target");
  const parsedRelease = release(input.release, "manual production control report release");
  const executedAt = text(input.executedAt, "manual production control report executedAt");
  if (!Number.isFinite(Date.parse(executedAt))) {
    throw new Error("manual production control report executedAt is invalid");
  }
  if (!Array.isArray(input.checks) || input.checks.length === 0) {
    throw new Error("manual production control report must contain checks");
  }
  const checks = input.checks.map((raw, index): ManualProductionCheckResult => {
    const check = object(raw, `manual production control report checks[${index}]`);
    const id = text(check.id, `manual production control report checks[${index}].id`);
    const result = text(check.result, `manual production control report checks[${index}].result`);
    if (result !== "passed" && result !== "failed") {
      throw new Error(`manual production control report check ${id} has an invalid result`);
    }
    const evidenceSummary = text(
      check.evidenceSummary,
      `manual production control report checks[${index}].evidenceSummary`,
    );
    if (evidenceSummary.length < 12 || evidenceSummary.length > 500) {
      throw new Error(`manual production control report check ${id} evidenceSummary must contain 12 to 500 characters`);
    }
    return { id, result, evidenceSummary };
  });
  if (new Set(checks.map((check) => check.id)).size !== checks.length) {
    throw new Error("manual production control report has duplicate check ids");
  }
  return {
    schemaVersion: 1,
    controlId,
    target,
    release: parsedRelease,
    executedAt,
    checks,
  };
}

export function validateManualProductionControlReport(input: {
  readonly catalog: ManualProductionProcedureCatalog;
  readonly control: ProductionEvidenceControl;
  readonly report: ManualProductionControlReport;
  readonly expectedTarget: ProductionEvidenceTarget;
  readonly expectedRelease: string | null;
  readonly expectedResult: "passed" | "failed";
}): void {
  if (input.control.method !== "manual") {
    throw new Error(`${input.control.id} is not a manual production control`);
  }
  const procedure = input.catalog.procedures.find(
    (candidate) => candidate.controlId === input.control.id,
  );
  if (procedure === undefined) {
    throw new Error(`${input.control.id} has no manual production procedure`);
  }
  if (input.report.controlId !== input.control.id) {
    throw new Error(`manual report controlId does not match ${input.control.id}`);
  }
  if (JSON.stringify(input.report.target) !== JSON.stringify(input.expectedTarget)) {
    throw new Error(`manual report target does not match ${input.control.id}`);
  }
  if (input.report.release !== input.expectedRelease) {
    throw new Error(`manual report release does not match ${input.control.id}`);
  }
  const expectedCheckIds = procedure.checks.map((check) => check.id).sort();
  const actualCheckIds = input.report.checks.map((check) => check.id).sort();
  if (JSON.stringify(actualCheckIds) !== JSON.stringify(expectedCheckIds)) {
    throw new Error(`manual report for ${input.control.id} does not contain the exact required checks`);
  }
  const derivedResult = input.report.checks.every((check) => check.result === "passed")
    ? "passed"
    : "failed";
  if (derivedResult !== input.expectedResult) {
    throw new Error(
      `manual report for ${input.control.id} derives ${derivedResult}, not ${input.expectedResult}`,
    );
  }
}
