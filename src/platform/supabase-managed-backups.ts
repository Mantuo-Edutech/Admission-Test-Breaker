export const MANAGED_BACKUP_MAX_AGE_HOURS = 30;

const MAX_CLOCK_SKEW_MILLISECONDS = 5 * 60 * 1_000;

export interface SupabaseManagedBackupsResponse {
  readonly region?: unknown;
  readonly walg_enabled?: unknown;
  readonly pitr_enabled?: unknown;
  readonly backups?: unknown;
  readonly physical_backup_data?: unknown;
}

export type SupabaseManagedBackupStrategy =
  | "daily-backup"
  | "point-in-time-recovery"
  | "none";

export interface SupabaseManagedBackupAssessment {
  readonly ready: boolean;
  readonly strategy: SupabaseManagedBackupStrategy;
  readonly region: string | null;
  readonly walgEnabled: boolean;
  readonly pitrEnabled: boolean;
  readonly completedBackupCount: number;
  readonly latestRestorePoint: string | null;
  readonly latestRestorePointAgeHours: number | null;
  readonly issues: readonly string[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestampMilliseconds(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function unixSecondsMilliseconds(value: unknown): number | null {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value <= 0
  ) return null;
  return value * 1_000;
}

function restorePointIssue(
  restorePointMilliseconds: number,
  nowMilliseconds: number,
  maximumAgeHours: number,
): string | null {
  if (restorePointMilliseconds > nowMilliseconds + MAX_CLOCK_SKEW_MILLISECONDS) {
    return "最新恢复点晚于当前时间，无法作为可信备份证据。";
  }
  const ageHours = (nowMilliseconds - restorePointMilliseconds) / 3_600_000;
  if (ageHours > maximumAgeHours) {
    return `最新恢复点超过 ${maximumAgeHours} 小时，不能满足生产恢复点时效门槛。`;
  }
  return null;
}

export function assessSupabaseManagedBackups(
  value: unknown,
  now = new Date(),
  maximumAgeHours = MANAGED_BACKUP_MAX_AGE_HOURS,
): SupabaseManagedBackupAssessment {
  if (!Number.isFinite(now.getTime())) throw new Error("now must be a valid Date");
  if (!Number.isFinite(maximumAgeHours) || maximumAgeHours <= 0) {
    throw new Error("maximumAgeHours must be a positive number");
  }

  const issues: string[] = [];
  const payload: SupabaseManagedBackupsResponse = record(value) ? value : {};
  if (!record(value)) issues.push("Supabase 备份 API 响应必须是对象。");

  const region = typeof payload.region === "string" && payload.region.trim() !== ""
    ? payload.region.trim()
    : null;
  if (region === null) issues.push("Supabase 备份 API 未返回有效 region。");

  const walgEnabled = payload.walg_enabled === true;
  const pitrEnabled = payload.pitr_enabled === true;
  if (typeof payload.walg_enabled !== "boolean") {
    issues.push("Supabase 备份 API 未返回有效 walg_enabled 状态。");
  }
  if (typeof payload.pitr_enabled !== "boolean") {
    issues.push("Supabase 备份 API 未返回有效 pitr_enabled 状态。");
  }
  if (!walgEnabled) {
    issues.push("Supabase 托管备份日志未启用。仅有项目可用性不能证明存在恢复点。");
  }

  const backups = Array.isArray(payload.backups) ? payload.backups : [];
  if (!Array.isArray(payload.backups)) {
    issues.push("Supabase 备份 API 未返回有效 backups 列表。");
  }
  const completedBackupTimestamps: number[] = [];
  let completedBackupCount = 0;
  for (const backup of backups) {
    if (!record(backup) || backup.status !== "COMPLETED") continue;
    completedBackupCount += 1;
    const insertedAt = timestampMilliseconds(backup.inserted_at);
    if (insertedAt === null) {
      issues.push("Supabase 返回的已完成备份缺少有效 inserted_at。");
      continue;
    }
    completedBackupTimestamps.push(insertedAt);
  }

  const nowMilliseconds = now.getTime();
  let strategy: SupabaseManagedBackupStrategy = "none";
  let latestRestorePointMilliseconds: number | null = null;

  if (pitrEnabled) {
    strategy = "point-in-time-recovery";
    const physical = record(payload.physical_backup_data)
      ? payload.physical_backup_data
      : {};
    if (!record(payload.physical_backup_data)) {
      issues.push("PITR 已启用，但 physical_backup_data 缺失。");
    }
    const earliest = unixSecondsMilliseconds(
      physical.earliest_physical_backup_date_unix,
    );
    const latest = unixSecondsMilliseconds(
      physical.latest_physical_backup_date_unix,
    );
    if (earliest === null || latest === null) {
      issues.push("PITR 已启用，但最早或最新恢复点无效。");
    } else if (earliest > latest) {
      issues.push("PITR 最早恢复点晚于最新恢复点。");
    } else {
      latestRestorePointMilliseconds = latest;
    }
  } else if (completedBackupTimestamps.length > 0) {
    strategy = "daily-backup";
    latestRestorePointMilliseconds = Math.max(...completedBackupTimestamps);
  } else {
    issues.push("尚无可验证的已完成每日备份或 PITR 恢复点。");
  }

  if (latestRestorePointMilliseconds !== null) {
    const issue = restorePointIssue(
      latestRestorePointMilliseconds,
      nowMilliseconds,
      maximumAgeHours,
    );
    if (issue !== null) issues.push(issue);
  }

  const latestRestorePoint = latestRestorePointMilliseconds === null
    ? null
    : new Date(latestRestorePointMilliseconds).toISOString();
  const latestRestorePointAgeHours = latestRestorePointMilliseconds === null
    ? null
    : (nowMilliseconds - latestRestorePointMilliseconds) / 3_600_000;

  return {
    ready: issues.length === 0 && latestRestorePointMilliseconds !== null,
    strategy,
    region,
    walgEnabled,
    pitrEnabled,
    completedBackupCount,
    latestRestorePoint,
    latestRestorePointAgeHours,
    issues,
  };
}
