import {
  assessSupabaseManagedBackups,
  MANAGED_BACKUP_MAX_AGE_HOURS,
} from "../src/platform/supabase-managed-backups.js";

const SUPABASE_MANAGEMENT_API_ORIGIN = "https://api.supabase.com";

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") throw new Error(`${name} is required`);
  return value.trim();
}

function projectReference(value: string): string {
  if (!/^[a-z0-9]{20}$/u.test(value)) {
    throw new Error("SUPABASE_PROJECT_REF must be a 20-character project reference");
  }
  return value;
}

function accessToken(value: string): string {
  if (!/^sbp_[A-Za-z0-9_-]{20,512}$/u.test(value)) {
    throw new Error("SUPABASE_ACCESS_TOKEN has an invalid format");
  }
  return value;
}

async function readManagedBackups(projectRef: string, token: string): Promise<unknown> {
  const endpoint = new URL(
    `/v1/projects/${projectRef}/database/backups`,
    SUPABASE_MANAGEMENT_API_ORIGIN,
  );
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Supabase managed backup check failed with HTTP ${response.status}`);
  }
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error("Supabase managed backup API returned unreadable JSON");
  }
}

async function main(): Promise<void> {
  const projectRef = projectReference(requiredEnvironment("SUPABASE_PROJECT_REF"));
  const token = accessToken(requiredEnvironment("SUPABASE_ACCESS_TOKEN"));
  const payload = await readManagedBackups(projectRef, token);
  const assessment = assessSupabaseManagedBackups(payload);

  console.log("Supabase managed backup evidence");
  console.log(`- strategy: ${assessment.strategy}`);
  console.log(`- region returned: ${assessment.region === null ? "no" : "yes"}`);
  console.log(`- WAL-G enabled: ${assessment.walgEnabled ? "yes" : "no"}`);
  console.log(`- PITR enabled: ${assessment.pitrEnabled ? "yes" : "no"}`);
  console.log(`- completed backups: ${assessment.completedBackupCount}`);
  console.log(`- latest restore point: ${assessment.latestRestorePoint ?? "none"}`);
  console.log(
    `- restore point age: ${assessment.latestRestorePointAgeHours === null
      ? "unknown"
      : `${assessment.latestRestorePointAgeHours.toFixed(2)} hours`}`,
  );
  console.log(`- maximum accepted age: ${MANAGED_BACKUP_MAX_AGE_HOURS} hours`);

  if (!assessment.ready) {
    for (const issue of assessment.issues) console.error(`- blocked: ${issue.trim()}`);
    throw new Error("Production requires a recent managed restore point before database mutation");
  }
  console.log("Managed backup gate: ready");
}

await main();
