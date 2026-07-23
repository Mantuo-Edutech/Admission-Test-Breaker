import { createHash } from "node:crypto";

export const PRODUCTION_P0_GATES = [
  "B100-P0-01",
  "B100-P0-02",
  "B100-P0-03",
  "B100-P0-04",
  "B100-P0-05",
  "B100-P0-06",
] as const;

export type ProductionP0GateId = typeof PRODUCTION_P0_GATES[number];
export const REPOSITORY_VERIFIED_PRODUCTION_GATES = ["B100-P0-06"] as const;
export type ProductionEvidenceMethod = "automated" | "manual";
export type ProductionEvidenceScope = "release" | "environment";

const PRODUCTION_EVIDENCE_FRAMEWORK_SOURCE_PATHS = [
  "scripts/record-production-evidence.ts",
  "src/platform/production-evidence-ledger.ts",
] as const;

export interface ProductionEvidenceTarget {
  readonly environment: "production";
  readonly origin: string;
  readonly supabaseProjectRef: string;
}

export interface ProductionEvidenceCommand {
  readonly program: "pnpm";
  readonly args: readonly string[];
  readonly requiredEnvironment: readonly string[];
  readonly targetEnvironment: Readonly<Record<string, TargetEnvironmentValue>>;
}

export type TargetEnvironmentValue =
  | "origin"
  | "environment"
  | "supabaseProjectRef"
  | "supabaseUrl"
  | "release"
  | "remoteVerifyConfirmation";

export interface ProductionEvidenceControl {
  readonly id: string;
  readonly label: string;
  readonly method: ProductionEvidenceMethod;
  readonly scope: ProductionEvidenceScope;
  readonly maxAgeHours: number;
  readonly gates: readonly ProductionP0GateId[];
  readonly sourcePaths: readonly string[];
  readonly command?: ProductionEvidenceCommand;
}

export interface ProductionEvidenceCatalog {
  readonly schemaVersion: 1;
  readonly revision: string;
  readonly target: ProductionEvidenceTarget;
  readonly controls: readonly ProductionEvidenceControl[];
}

export interface ProductionEvidenceArtifact {
  readonly path: string;
  readonly sha256: string;
}

export interface ProductionEvidenceRecord {
  readonly schemaVersion: 1;
  readonly controlId: string;
  readonly method: ProductionEvidenceMethod;
  readonly result: "passed" | "failed";
  readonly target: ProductionEvidenceTarget;
  readonly release: string | null;
  readonly observedAt: string;
  readonly sourceFingerprint: string;
  readonly summary: string;
  readonly command?: {
    readonly program: string;
    readonly args: readonly string[];
    readonly outputSha256: string;
    readonly outputBytes: number;
  };
  readonly reviewer?: {
    readonly reviewerRef: string;
    readonly role: string;
    readonly attestation: "I_COMPLETED_THIS_PRODUCTION_CONTROL";
  };
  readonly artifacts: readonly ProductionEvidenceArtifact[];
}

export interface ProductionEvidenceControlAssessment {
  readonly id: string;
  readonly label: string;
  readonly ready: boolean;
  readonly reason: string;
  readonly evidence?: ProductionEvidenceRecord;
}

export interface ProductionEvidenceGateAssessment {
  readonly id: ProductionP0GateId;
  readonly status: "verified" | "partial" | "incomplete";
  readonly source: "repository" | "production-evidence" | "missing";
  readonly controls: readonly ProductionEvidenceControlAssessment[];
}

export interface ProductionEvidenceAssessment {
  readonly ready: boolean;
  readonly verifiedGateCount: number;
  readonly totalGateCount: number;
  readonly gates: readonly ProductionEvidenceGateAssessment[];
  readonly controls: readonly ProductionEvidenceControlAssessment[];
}

export interface ProductionEvidenceWorkspace {
  readonly scope: ProductionEvidenceScope;
  readonly release: string | null;
  readonly head: string;
  readonly porcelainStatus: string;
}

type UnknownRecord = Record<string, unknown>;

function object(value: unknown, label: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as UnknownRecord;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is required`);
  return value.trim();
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must not be empty`);
  return value.map((item, index) => text(item, `${label}[${index}]`));
}

function safePath(value: string): boolean {
  return !value.startsWith("/") && !value.split(/[\\/]/u).includes("..");
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function validSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/u.test(value);
}

function changedPaths(porcelainStatus: string): readonly string[] {
  return porcelainStatus
    .split(/\r?\n/u)
    .filter(Boolean)
    .flatMap((line) => {
      if (line.length < 4 || line[2] !== " ") {
        throw new Error("Git returned an unreadable production evidence workspace status");
      }
      const path = line.slice(3);
      if (path.startsWith('"') || path.endsWith('"')) {
        throw new Error("Production evidence workspace paths must be unquoted UTF-8 paths");
      }
      return path.split(" -> ");
    });
}

export function assertProductionEvidenceWorkspace(
  workspace: ProductionEvidenceWorkspace,
): void {
  if (!/^[a-f0-9]{40}$/u.test(workspace.head)) {
    throw new Error("Production evidence requires an exact Git HEAD commit");
  }
  if (workspace.scope === "release" && workspace.release !== workspace.head) {
    throw new Error("Release-scoped production evidence must run from the exact release commit");
  }
  if (workspace.scope === "environment" && workspace.release !== null) {
    throw new Error("Environment-scoped production evidence must not claim a release commit");
  }
  const unsafeChanges = changedPaths(workspace.porcelainStatus).filter(
    (path) => !path.startsWith("verification/production/evidence/"),
  );
  if (unsafeChanges.length > 0) {
    throw new Error(
      `Production evidence workspace contains changes outside the evidence ledger: ${unsafeChanges.join(", ")}`,
    );
  }
}

function productionTarget(value: unknown, label: string): ProductionEvidenceTarget {
  const target = object(value, label);
  const environment = text(target.environment, `${label}.environment`);
  const origin = text(target.origin, `${label}.origin`);
  const supabaseProjectRef = text(target.supabaseProjectRef, `${label}.supabaseProjectRef`);
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

export function parseProductionEvidenceCatalog(value: unknown): ProductionEvidenceCatalog {
  const input = object(value, "production evidence catalog");
  if (input.schemaVersion !== 1) throw new Error("production evidence catalog schemaVersion must be 1");
  const revision = text(input.revision, "production evidence catalog revision");
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/u.test(revision)) throw new Error("production evidence catalog revision is invalid");
  const target = productionTarget(input.target, "production evidence catalog target");
  if (!Array.isArray(input.controls) || input.controls.length === 0) {
    throw new Error("production evidence catalog controls must not be empty");
  }
  const controls = input.controls.map((raw, index): ProductionEvidenceControl => {
    const control = object(raw, `controls[${index}]`);
    const id = text(control.id, `controls[${index}].id`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) throw new Error(`control ${id} has an invalid id`);
    const label = text(control.label, `controls[${index}].label`);
    const method = text(control.method, `controls[${index}].method`);
    const scope = text(control.scope, `controls[${index}].scope`);
    if (method !== "automated" && method !== "manual") throw new Error(`control ${id} has an invalid method`);
    if (scope !== "release" && scope !== "environment") throw new Error(`control ${id} has an invalid scope`);
    if (typeof control.maxAgeHours !== "number" || !Number.isInteger(control.maxAgeHours) || control.maxAgeHours < 1) {
      throw new Error(`control ${id} has an invalid maxAgeHours`);
    }
    const gates = stringArray(control.gates, `control ${id} gates`);
    if (!gates.every((gate): gate is ProductionP0GateId => PRODUCTION_P0_GATES.includes(gate as ProductionP0GateId))) {
      throw new Error(`control ${id} references an unknown P0 gate`);
    }
    const sourcePaths = stringArray(control.sourcePaths, `control ${id} sourcePaths`);
    if (!sourcePaths.every(safePath) || new Set(sourcePaths).size !== sourcePaths.length) {
      throw new Error(`control ${id} has unsafe or duplicate source paths`);
    }
    let command: ProductionEvidenceCommand | undefined;
    if (method === "automated") {
      const rawCommand = object(control.command, `control ${id} command`);
      if (rawCommand.program !== "pnpm") throw new Error(`control ${id} may only run pnpm`);
      const args = stringArray(rawCommand.args, `control ${id} command args`);
      const requiredEnvironment = Array.isArray(rawCommand.requiredEnvironment)
        ? rawCommand.requiredEnvironment.map((item, envIndex) => text(item, `control ${id} requiredEnvironment[${envIndex}]`))
        : [];
      const targetEnvironmentObject = object(rawCommand.targetEnvironment, `control ${id} targetEnvironment`);
      const allowedTargetValues: TargetEnvironmentValue[] = [
        "origin", "environment", "supabaseProjectRef", "supabaseUrl", "release", "remoteVerifyConfirmation",
      ];
      const targetEnvironment: Record<string, TargetEnvironmentValue> = {};
      for (const [name, rawValue] of Object.entries(targetEnvironmentObject)) {
        if (!/^[A-Z][A-Z0-9_]*$/u.test(name)) throw new Error(`control ${id} has an invalid environment name`);
        const targetValue = text(rawValue, `control ${id} targetEnvironment.${name}`) as TargetEnvironmentValue;
        if (!allowedTargetValues.includes(targetValue)) throw new Error(`control ${id} has an invalid target environment value`);
        targetEnvironment[name] = targetValue;
      }
      if (scope === "environment" && Object.values(targetEnvironment).includes("release")) {
        throw new Error(`environment-scoped control ${id} must not inject a release`);
      }
      command = { program: "pnpm", args, requiredEnvironment, targetEnvironment };
    } else if (control.command !== undefined) {
      throw new Error(`manual control ${id} must not define a command`);
    }
    return {
      id,
      label,
      method,
      scope,
      maxAgeHours: control.maxAgeHours,
      gates,
      sourcePaths,
      ...(command === undefined ? {} : { command }),
    };
  });
  if (new Set(controls.map((control) => control.id)).size !== controls.length) {
    throw new Error("production evidence control ids must be unique");
  }
  return { schemaVersion: 1, revision, target, controls };
}

function rejectSensitiveText(value: string): void {
  if (
    value.includes("@")
    || /(?:sbp_|sb_secret_|service[_-]?role|bearer\s+|password\s*[:=])/iu.test(value)
    || /\beyJ[A-Za-z0-9_-]{20,}\b/u.test(value)
  ) {
    throw new Error("production evidence must not contain credentials, email addresses or token-like values");
  }
}

export function parseProductionEvidenceRecord(value: unknown): ProductionEvidenceRecord {
  rejectSensitiveText(JSON.stringify(value));
  const input = object(value, "production evidence record");
  if (input.schemaVersion !== 1) throw new Error("production evidence record schemaVersion must be 1");
  const controlId = text(input.controlId, "production evidence controlId");
  const method = text(input.method, "production evidence method");
  const result = text(input.result, "production evidence result");
  if (method !== "automated" && method !== "manual") throw new Error("production evidence method is invalid");
  if (result !== "passed" && result !== "failed") throw new Error("production evidence result is invalid");
  const target = productionTarget(input.target, "production evidence target");
  const release = input.release === null ? null : text(input.release, "production evidence release");
  if (release !== null && !/^[a-f0-9]{40}$/u.test(release)) throw new Error("production evidence release is invalid");
  const observedAt = text(input.observedAt, "production evidence observedAt");
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error("production evidence observedAt is invalid");
  const sourceFingerprint = text(input.sourceFingerprint, "production evidence sourceFingerprint");
  if (!validSha256(sourceFingerprint)) throw new Error("production evidence sourceFingerprint is invalid");
  const summary = text(input.summary, "production evidence summary");
  if (summary.length < 12 || summary.length > 240) throw new Error("production evidence summary must contain 12 to 240 characters");
  const artifacts = Array.isArray(input.artifacts)
    ? input.artifacts.map((raw, index): ProductionEvidenceArtifact => {
      const artifact = object(raw, `production evidence artifacts[${index}]`);
      const artifactPath = text(artifact.path, `production evidence artifacts[${index}].path`);
      const artifactSha = text(artifact.sha256, `production evidence artifacts[${index}].sha256`);
      if (!safePath(artifactPath) || !artifactPath.startsWith("verification/production/evidence/artifacts/")) {
        throw new Error("manual production evidence artifacts must stay inside the evidence artifact directory");
      }
      if (!validSha256(artifactSha)) throw new Error("production evidence artifact sha256 is invalid");
      return { path: artifactPath, sha256: artifactSha };
    })
    : [];

  let command: ProductionEvidenceRecord["command"];
  let reviewer: ProductionEvidenceRecord["reviewer"];
  if (method === "automated") {
    const rawCommand = object(input.command, "automated production evidence command");
    const program = text(rawCommand.program, "automated production evidence command.program");
    const args = stringArray(rawCommand.args, "automated production evidence command.args");
    const outputSha256 = text(rawCommand.outputSha256, "automated production evidence command.outputSha256");
    if (!validSha256(outputSha256)) throw new Error("automated production evidence outputSha256 is invalid");
    if (typeof rawCommand.outputBytes !== "number" || !Number.isInteger(rawCommand.outputBytes) || rawCommand.outputBytes < 0) {
      throw new Error("automated production evidence outputBytes is invalid");
    }
    command = { program, args, outputSha256, outputBytes: rawCommand.outputBytes };
    if (input.reviewer !== undefined || artifacts.length !== 0) {
      throw new Error("automated production evidence must not contain reviewer or manual artifacts");
    }
  } else {
    const rawReviewer = object(input.reviewer, "manual production evidence reviewer");
    const reviewerRef = text(rawReviewer.reviewerRef, "manual production evidence reviewerRef");
    const role = text(rawReviewer.role, "manual production evidence role");
    if (rawReviewer.attestation !== "I_COMPLETED_THIS_PRODUCTION_CONTROL") {
      throw new Error("manual production evidence has no exact attestation");
    }
    if (artifacts.length === 0) throw new Error("manual production evidence requires at least one artifact");
    reviewer = { reviewerRef, role, attestation: "I_COMPLETED_THIS_PRODUCTION_CONTROL" };
    if (input.command !== undefined) throw new Error("manual production evidence must not contain a command");
  }
  return {
    schemaVersion: 1,
    controlId,
    method,
    result,
    target,
    release,
    observedAt,
    sourceFingerprint,
    summary,
    ...(command === undefined ? {} : { command }),
    ...(reviewer === undefined ? {} : { reviewer }),
    artifacts,
  };
}

export async function productionControlSourceFingerprint(
  catalog: ProductionEvidenceCatalog,
  control: ProductionEvidenceControl,
  read: (path: string) => Promise<string | Uint8Array>,
): Promise<string> {
  const sources = [];
  const sourcePaths = [...new Set([
    ...PRODUCTION_EVIDENCE_FRAMEWORK_SOURCE_PATHS,
    ...control.sourcePaths,
  ])].sort();
  for (const sourcePath of sourcePaths) {
    sources.push({ path: sourcePath, sha256: sha256(await read(sourcePath)) });
  }
  return sha256(JSON.stringify({
    target: catalog.target,
    control,
    sources,
  }));
}

function sameTarget(first: ProductionEvidenceTarget, second: ProductionEvidenceTarget): boolean {
  return first.environment === second.environment
    && first.origin === second.origin
    && first.supabaseProjectRef === second.supabaseProjectRef;
}

function controlAssessment(
  catalog: ProductionEvidenceCatalog,
  control: ProductionEvidenceControl,
  records: readonly ProductionEvidenceRecord[],
  sourceFingerprint: string,
  expectedRelease: string | undefined,
  now: Date,
): ProductionEvidenceControlAssessment {
  const candidates = records
    .filter((record) => record.controlId === control.id)
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  const evidence = candidates[0];
  if (evidence === undefined) return { id: control.id, label: control.label, ready: false, reason: "尚无证据" };
  if (evidence.method !== control.method) return { id: control.id, label: control.label, ready: false, reason: "证据类型与控制目录不一致", evidence };
  if (!sameTarget(evidence.target, catalog.target)) return { id: control.id, label: control.label, ready: false, reason: "证据目标环境不一致", evidence };
  if (evidence.sourceFingerprint !== sourceFingerprint) return { id: control.id, label: control.label, ready: false, reason: "控制代码或配置已变化", evidence };
  if (control.scope === "release") {
    if (expectedRelease === undefined) return { id: control.id, label: control.label, ready: false, reason: "未指定待发布 release", evidence };
    if (evidence.release !== expectedRelease) return { id: control.id, label: control.label, ready: false, reason: "证据不属于待发布 release", evidence };
  }
  if (control.scope === "environment" && evidence.release !== null) {
    return { id: control.id, label: control.label, ready: false, reason: "环境级证据不应绑定 release", evidence };
  }
  const observedAt = Date.parse(evidence.observedAt);
  const ageHours = (now.getTime() - observedAt) / 3_600_000;
  if (ageHours < -5 / 60) return { id: control.id, label: control.label, ready: false, reason: "证据时间来自未来", evidence };
  if (ageHours > control.maxAgeHours) return { id: control.id, label: control.label, ready: false, reason: "证据已过期", evidence };
  if (control.method === "automated") {
    if (
      evidence.command?.program !== control.command?.program
      || JSON.stringify(evidence.command?.args) !== JSON.stringify(control.command?.args)
    ) {
      return { id: control.id, label: control.label, ready: false, reason: "执行命令与控制目录不一致", evidence };
    }
  }
  if (evidence.result !== "passed") return { id: control.id, label: control.label, ready: false, reason: "最近一次验证失败", evidence };
  return { id: control.id, label: control.label, ready: true, reason: "证据有效", evidence };
}

export function assessProductionEvidence(input: {
  readonly catalog: ProductionEvidenceCatalog;
  readonly records: readonly ProductionEvidenceRecord[];
  readonly sourceFingerprints: Readonly<Record<string, string>>;
  readonly repositoryVerifiedGates: readonly ProductionP0GateId[];
  readonly expectedRelease?: string;
  readonly now?: Date;
}): ProductionEvidenceAssessment {
  if (input.expectedRelease !== undefined && !/^[a-f0-9]{40}$/u.test(input.expectedRelease)) {
    throw new Error("expected production release must be a full lowercase commit SHA");
  }
  const now = input.now ?? new Date();
  for (const gate of input.repositoryVerifiedGates) {
    if (!REPOSITORY_VERIFIED_PRODUCTION_GATES.includes(
      gate as typeof REPOSITORY_VERIFIED_PRODUCTION_GATES[number],
    )) {
      throw new Error(`P0 gate ${gate} cannot be verified by a static repository label`);
    }
  }
  const controls = input.catalog.controls.map((control) => {
    const fingerprint = input.sourceFingerprints[control.id];
    if (fingerprint === undefined || !validSha256(fingerprint)) {
      throw new Error(`control ${control.id} has no valid source fingerprint`);
    }
    return controlAssessment(
      input.catalog,
      control,
      input.records,
      fingerprint,
      input.expectedRelease,
      now,
    );
  });
  const gates = PRODUCTION_P0_GATES.map((id): ProductionEvidenceGateAssessment => {
    if (input.repositoryVerifiedGates.includes(id)) {
      return { id, status: "verified", source: "repository", controls: [] };
    }
    const required = input.catalog.controls
      .filter((control) => control.gates.includes(id))
      .map((control) => controls.find((assessment) => assessment.id === control.id)!);
    const passed = required.filter((control) => control.ready).length;
    const status = required.length > 0 && passed === required.length
      ? "verified"
      : passed > 0
        ? "partial"
        : "incomplete";
    return { id, status, source: status === "verified" ? "production-evidence" : "missing", controls: required };
  });
  const verifiedGateCount = gates.filter((gate) => gate.status === "verified").length;
  return {
    ready: verifiedGateCount === gates.length,
    verifiedGateCount,
    totalGateCount: gates.length,
    gates,
    controls,
  };
}

export function productionTargetEnvironment(
  target: ProductionEvidenceTarget,
  release: string,
  value: TargetEnvironmentValue,
): string {
  if (value === "origin") return target.origin;
  if (value === "environment") return target.environment;
  if (value === "supabaseProjectRef") return target.supabaseProjectRef;
  if (value === "supabaseUrl") return `https://${target.supabaseProjectRef}.supabase.co`;
  if (value === "release") return release;
  return "CREATE_AND_DELETE_REMOTE_TEST_USERS";
}

export function sha256Text(value: string | Uint8Array): string {
  return sha256(value);
}
